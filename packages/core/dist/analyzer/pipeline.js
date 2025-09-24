export async function runPipeline(events, deps) {
    // 1) fingerprint (use first event for MVP; later combine top frames etc.)
    const fp = events[0] ? deps.fingerprinter.fingerprint(events[0]) : "unknown";
    // 2) summarizer (LLM later; rule-based placeholder for MVP)
    const summary = await deps.summarizer.summarize(events);
    // 3) KB lookup (very naive for MVP: search summary string)
    const kbItems = await deps.kb.lookup(summary);
    const suggestions = kbItems.map(i => ({ title: i.pattern, fix: i.fix, source: "kb", score: 0.7 }));
    return { fingerprint: fp, summary, suggestions, events };
}
//# sourceMappingURL=pipeline.js.map