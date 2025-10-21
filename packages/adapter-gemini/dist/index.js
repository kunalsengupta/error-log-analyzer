import { GoogleGenerativeAI } from "@google/generative-ai";
export function makeGeminiSummarizer(opts = {}) {
    const apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY;
    if (!apiKey)
        throw new Error("GEMINI_API_KEY not set");
    const modelId = opts.model ?? process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: modelId,
        generationConfig: { temperature: opts.temperature ?? 0.2 }
    });
    const includeStackLines = Math.max(0, opts.includeStackLines ?? 6);
    const maxRetries = Math.max(0, opts.maxRetries ?? 2);
    const timeoutMs = Math.max(1000, opts.timeoutMs ?? 15000);
    return {
        async summarize(events) {
            // Compact + scrubbed logs
            const blocks = events.map((e, i) => {
                const stack = (e.stack ?? "")
                    .split("\n")
                    .slice(0, includeStackLines)
                    .join("\n")
                    .trim();
                const seededFiles = extractPathsFromText(`${e.message}\n${e.stack ?? ""}`);
                const header = `#${i + 1} [${(e.level ?? "info").toLowerCase()}] ${scrubPII(e.message)}`;
                const stackPart = stack ? `STACK:\n${scrubPII(stack)}` : "";
                const seedPart = seededFiles.length ? `SEED_FILES:\n${seededFiles.join("\n")}` : "";
                return [header, stackPart, seedPart].filter(Boolean).join("\n");
            }).join("\n\n");
            const schemaHint = `
Return ONLY valid JSON (no backticks). Use this exact shape:
{
  "title": string,
  "probable_cause": string,
  "error_level": "error"|"warn"|"info",
  "priority": "P0"|"P1"|"P2"|"P3",
  "files_to_check": string[],
  "commands_to_run": string[],
  "checks": string[],
  "fixes": string[],
  "related_docs": string[] | [],
  "confidence": number
}`;
            const prompt = `
You are a senior SRE. Read the logs and produce a terse, actionable incident analysis.

Guidelines:
- Be specific about files/modules (e.g., "src/db.ts", "docker-compose.yml", "nginx.conf").
- Include concrete CLI checks (e.g., "redis-cli ping", "lsof -i :6379", "kubectl logs <pod>").
- Prioritize least-risk, fastest fixes first; if unsure, propose useful checks and set confidence.
- Map severity to "error_level": use the most severe level seen in logs.
- If SEED_FILES are provided, consider them in "files_to_check".

${schemaHint}

Logs:
${blocks}
`;
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const jsonText = await withRetries(maxRetries, async () => {
                    const res = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] }, { signal: controller.signal });
                    return res.response.text().trim();
                });
                const json = normalizeJSON(jsonText, events);
                // Render for console (you can later switch to returning JSON)
                return formatForConsole(json);
            }
            finally {
                clearTimeout(timer);
            }
        }
    };
}
/* ---------------- helpers ---------------- */
function withRetries(retries, fn) {
    let attempt = 0;
    const backoff = (n) => new Promise(r => setTimeout(r, 200 * Math.pow(2, n)));
    return (async function run() {
        try {
            return await fn();
        }
        catch (err) {
            // Retry on rate limits / 5xx / fetch
            const msg = String(err?.message ?? err);
            const status = Number(err?.status ?? 0);
            const retriable = status === 429 || status >= 500 || /fetch|timeout|ECONNRESET|ETIMEDOUT/i.test(msg);
            if (attempt < retries && retriable) {
                await backoff(attempt++);
                return run();
            }
            // Helpful hint if model id is wrong (404)
            if (status === 404) {
                throw new Error(`Gemini model not found: check GEMINI_MODEL (${msg})`);
            }
            throw err;
        }
    })();
}
function scrubPII(text) {
    return text
        // bearer/api keys
        .replace(/(bearer|api[-_ ]?key)\s+[a-z0-9_\-]{8,}/gi, "$1 ****")
        // JWT
        .replace(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "***.***.***")
        // emails
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "****@****")
        // IPv4
        .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "***.***.***.***");
}
function extractPathsFromText(s) {
    if (!s)
        return [];
    const hits = new Set();
    // file.ts:123 or /path/to/file.js:45 or src/db.ts
    const re = /(?:(?:[A-Za-z]:)?[./\w-]+?\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|rb|java|cs|sql|yml|yaml|json|conf|ini))(?:[:(]\d+[:)]?)?/g;
    for (const m of s.matchAll(re))
        hits.add(m[0].replace(/[(:]\d+\)?$/, ""));
    return Array.from(hits).slice(0, 10);
}
function normalizeJSON(raw, events) {
    const highestLevel = inferHighestLevel(events);
    let obj;
    try {
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        const candidate = start >= 0 && end >= 0 ? raw.slice(start, end + 1) : raw;
        // Strip trailing commas which occasionally appear
        const cleaned = candidate.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
        obj = JSON.parse(cleaned);
    }
    catch {
        obj = { title: "Analysis", probable_cause: raw.slice(0, 200) };
    }
    // Defaults & validation
    const j = {
        title: (obj.title && String(obj.title).trim()) || "Analysis",
        probable_cause: (obj.probable_cause && String(obj.probable_cause).trim()) || "Insufficient details; verify service status, connectivity, and recent changes.",
        error_level: obj.error_level || highestLevel,
        priority: obj.priority || defaultPriorityFromLevel(obj.error_level || highestLevel),
        files_to_check: Array.isArray(obj.files_to_check) ? obj.files_to_check : [],
        commands_to_run: Array.isArray(obj.commands_to_run) ? obj.commands_to_run : [],
        checks: Array.isArray(obj.checks) ? obj.checks : [],
        fixes: Array.isArray(obj.fixes) ? obj.fixes : [],
        related_docs: Array.isArray(obj.related_docs) ? obj.related_docs : [],
        confidence: typeof obj.confidence === "number" ? clamp01(obj.confidence) : 0.6
    };
    return j;
}
function inferHighestLevel(events) {
    const levels = events.map(e => (e.level ?? "info").toLowerCase());
    if (levels.includes("error"))
        return "error";
    if (levels.includes("warn"))
        return "warn";
    return "info";
}
function defaultPriorityFromLevel(level) {
    if (level === "error")
        return "P1";
    if (level === "warn")
        return "P2";
    return "P3";
}
function clamp01(n) { return Math.max(0, Math.min(1, n)); }
function formatForConsole(j) {
    const pad = (arr) => (arr && arr.length ? `\n - ${arr.join("\n - ")}` : " (none)");
    return [
        `Title: ${j.title}`,
        `Probable Cause: ${j.probable_cause}`,
        `Level: ${j.error_level}   Priority: ${j.priority}   Confidence: ${Math.round(j.confidence * 100)}%`,
        `Files to Check:${pad(j.files_to_check)}`,
        `Checks:${pad(j.checks)}`,
        `Commands:${pad(j.commands_to_run)}`,
        `Fixes:${pad(j.fixes)}`,
        j.related_docs?.length ? `Docs:\n - ${j.related_docs.join("\n - ")}` : undefined
    ].filter(Boolean).join("\n");
}
//# sourceMappingURL=index.js.map