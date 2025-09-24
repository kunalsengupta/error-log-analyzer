import { GoogleGenerativeAI } from "@google/generative-ai";
import type { SummarizerPort, ELAEvent } from "@ela/core";

export interface GeminiSummarizerOptions {
  apiKey?: string;         // default: process.env.GEMINI_API_KEY
  model?: string;          // default: "gemini-1.5-flash"
  includeStackLines?: number; // default: 6
  temperature?: number;    // default: 0.2
}

type SummaryJSON = {
  title: string;                  // short human title
  probable_cause: string;         // what most likely happened (1–2 lines)
  error_level: "error"|"warn"|"info";
  priority: "P0"|"P1"|"P2"|"P3";
  files_to_check: string[];       // file paths / modules to inspect
  commands_to_run: string[];      // shell/db/cli commands
  checks: string[];               // things to verify (ports, env vars, creds)
  fixes: string[];                // actionable steps
  related_docs?: string[];        // URLs or doc notes if any
  confidence: number;             // 0..1
};

export function makeGeminiSummarizer(opts: GeminiSummarizerOptions = {}): SummarizerPort {
  const apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: opts.model ?? "gemini-1.5-flash",
    generationConfig: { temperature: opts.temperature ?? 0.2 }
  });

  const includeStackLines = Math.max(0, opts.includeStackLines ?? 6);

  return {
    async summarize(events: ELAEvent[]): Promise<string> {
      // Compact logs (cap stack)
      const blocks = events.map((e, i) => {
        const stack = (e.stack ?? "")
          .split("\n")
          .slice(0, includeStackLines)
          .join("\n")
          .trim();
        return [
          `#${i + 1} [${e.level ?? "info"}] ${e.message}`,
          stack && `STACK:\n${stack}`
        ].filter(Boolean).join("\n");
      }).join("\n\n");

      // Strict JSON instruction
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
You are a senior SRE. Read the logs and produce a terse, actionable incident analysis for a developer.

Guidelines:
- Be specific about files/modules (e.g., "src/db.ts", "docker-compose.yml", "nginx.conf").
- Include concrete CLI checks (e.g., "redis-cli ping", "lsof -i :6379", "kubectl logs <pod>").
- Prioritize fixes that are least risky & fastest first.
- If unsure, still propose useful checks and mark confidence accordingly.
- Map severity to "error_level": use the most severe level seen in logs.

${schemaHint}

Logs:
${blocks}
`;

      const res = await model.generateContent(prompt);
      const text = res.response.text().trim();

      // Robust JSON parse: sometimes models add stray text; try to extract the JSON object.
      const json = safeParseJSON<SummaryJSON>(text);

      // Fallbacks/normalization
      const highestLevel = inferHighestLevel(events);
      if (!json.error_level) json.error_level = highestLevel;
      if (!json.priority) json.priority = defaultPriorityFromLevel(json.error_level);
      if (!Array.isArray(json.files_to_check)) json.files_to_check = [];
      if (!Array.isArray(json.commands_to_run)) json.commands_to_run = [];
      if (!Array.isArray(json.checks)) json.checks = [];
      if (!Array.isArray(json.fixes)) json.fixes = [];
      if (!Array.isArray(json.related_docs)) json.related_docs = [];
      if (typeof json.confidence !== "number") json.confidence = 0.6;

      // Return a nicely formatted multi-line summary string (core expects string)
      // You can later change `AnalysisResult` to carry structured fields if you want.
      return formatForConsole(json);
    }
  };
}

// -------- helpers --------
function safeParseJSON<T>(s: string): T {
  try {
    // If there's extra text, try to find the first {...} block
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    const candidate = start >= 0 && end >= 0 ? s.slice(start, end + 1) : s;
    return JSON.parse(candidate) as T;
  } catch {
    // Minimal fallback object
    return {
      title: "Analysis",
      probable_cause: s.slice(0, 200),
      error_level: "error",
      priority: "P2",
      files_to_check: [],
      commands_to_run: [],
      checks: [],
      fixes: [],
      related_docs: [],
      confidence: 0.5
    } as unknown as T;
  }
}

function inferHighestLevel(events: ELAEvent[]): "error"|"warn"|"info" {
  const levels = events.map(e => (e.level ?? "info").toLowerCase());
  if (levels.includes("error")) return "error";
  if (levels.includes("warn")) return "warn";
  return "info";
}

function defaultPriorityFromLevel(level: "error"|"warn"|"info"): "P0"|"P1"|"P2"|"P3" {
  if (level === "error") return "P1";
  if (level === "warn") return "P2";
  return "P3";
}

function formatForConsole(j: SummaryJSON): string {
  const pad = (arr?: string[]) => (arr && arr.length ? `\n - ${arr.join("\n - ")}` : " (none)");
  return [
    `Title: ${j.title}`,
    ` Probable Cause: ${j.probable_cause}`,
    `Level: ${j.error_level}   Priority: ${j.priority}   Confidence: ${Math.round(j.confidence*100)}%`,
    `Files to Check:${pad(j.files_to_check)}`,
    `Checks:${pad(j.checks)}`,
    `Commands:${pad(j.commands_to_run)}`,
    `Fixes:${pad(j.fixes)}`,
    j.related_docs?.length ? `Docs:\n - ${j.related_docs.join("\n - ")}` : undefined
  ].filter(Boolean).join("\n");
}
