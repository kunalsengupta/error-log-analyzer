import { runPipeline } from "./pipeline.js";
// --- defaults (MVP stubs) ---
const defaultFingerprinter = {
    fingerprint(e) {
        // naive: hash by first word of message (replace with a better impl later)
        const m = (e.message || "").split(/\s+/)[0] || "unknown";
        return m.toLowerCase();
    },
};
const defaultSummarizer = {
    async summarize(events) {
        // naive: condense messages; prefer first error line
        const first = events[0];
        if (!first)
            return "No events";
        const base = first.message?.slice(0, 120) || "Event";
        return base;
    },
};
const defaultKB = {
    async lookup(q) {
        const items = [
            {
                pattern: "ConnectionTimeoutError",
                fix: "Check DB connection string, network reachability, and firewall rules.",
            },
            {
                pattern: "ECONNREFUSED",
                fix: "Verify target service is listening on the given host:port and not blocked by firewall.",
            },
        ];
        return items.filter((i) => q.includes(i.pattern));
    },
};
const consoleSink = {
    async publish(r) {
        // pretty minimal console output
        const head = `\n❌ Error Group: ${r.fingerprint}`;
        const sum = `🔎 Summary: ${r.summary}`;
        const sug = r.suggestions[0]
            ? `🛠 Suggested Fix: ${r.suggestions[0].fix}`
            : "🛠 Suggested Fix: (none)";
        // eslint-disable-next-line no-console
        console.log([head, sum, sug].join("\n"));
    },
};
export function createAnalyzer(cfg = {}) {
    const fingerprinter = cfg.fingerprinter ?? defaultFingerprinter;
    const summarizer = cfg.summarizer ?? defaultSummarizer;
    const kb = cfg.kb ?? defaultKB;
    const sinks = cfg.sinks ?? [consoleSink];
    return {
        async ingest(event) {
            const result = await runPipeline([event], {
                fingerprinter,
                summarizer,
                kb,
            });
            await Promise.all(sinks.map((s) => s.publish(result)));
        },
    };
}
//# sourceMappingURL=createAnalyzer.js.map