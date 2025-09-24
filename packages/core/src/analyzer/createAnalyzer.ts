import type { ELAEvent, AnalysisResult } from "../domain/ELAEvent.js";
import type {
  KnowledgeBasePort,
  SummarizerPort,
  SinkPort,
} from "../ports/index.js";
import { runPipeline, type Fingerprinter } from "./pipeline.js";

export interface AnalyzerConfig {
  fingerprinter?: Fingerprinter;
  summarizer?: SummarizerPort;
  kb?: KnowledgeBasePort;
  sinks?: SinkPort[];
}

export interface Analyzer {
  ingest(event: ELAEvent): Promise<void>;
}

// --- defaults (MVP stubs) ---
const defaultFingerprinter: Fingerprinter = {
  fingerprint(e) {
    // naive: hash by first word of message (replace with a better impl later)
    const m = (e.message || "").split(/\s+/)[0] || "unknown";
    return m.toLowerCase();
  },
};

const defaultSummarizer: SummarizerPort = {
  async summarize(events) {
    // naive: condense messages; prefer first error line
    const first = events[0];
    if (!first) return "No events";
    const base = first.message?.slice(0, 120) || "Event";
    return base;
  },
};

const defaultKB: KnowledgeBasePort = {
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

const consoleSink: SinkPort = {
  async publish(r: AnalysisResult) {
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

export function createAnalyzer(cfg: AnalyzerConfig = {}): Analyzer {
  const fingerprinter = cfg.fingerprinter ?? defaultFingerprinter;
  const summarizer = cfg.summarizer ?? defaultSummarizer;
  const kb = cfg.kb ?? defaultKB;
  const sinks = cfg.sinks ?? [consoleSink];

  return {
    async ingest(event: ELAEvent): Promise<void> {
      const result = await runPipeline([event], {
        fingerprinter,
        summarizer,
        kb,
      });
      await Promise.all(sinks.map((s) => s.publish(result)));
    },
  };
}
