import type { ELAEvent, AnalysisResult } from "../domain/ELAEvent.js";
import type { KnowledgeBasePort, SummarizerPort } from "../ports/index.js";
export interface Fingerprinter {
    fingerprint(e: ELAEvent): string;
}
export interface PipelineDeps {
    fingerprinter: Fingerprinter;
    summarizer: SummarizerPort;
    kb: KnowledgeBasePort;
}
export declare function runPipeline(events: ELAEvent[], deps: PipelineDeps): Promise<AnalysisResult>;
//# sourceMappingURL=pipeline.d.ts.map