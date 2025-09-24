import type { ELAEvent } from "../domain/ELAEvent.js";
import type { KnowledgeBasePort, SummarizerPort, SinkPort } from "../ports/index.js";
import { type Fingerprinter } from "./pipeline.js";
export interface AnalyzerConfig {
    fingerprinter?: Fingerprinter;
    summarizer?: SummarizerPort;
    kb?: KnowledgeBasePort;
    sinks?: SinkPort[];
}
export interface Analyzer {
    ingest(event: ELAEvent): Promise<void>;
}
export declare function createAnalyzer(cfg?: AnalyzerConfig): Analyzer;
//# sourceMappingURL=createAnalyzer.d.ts.map