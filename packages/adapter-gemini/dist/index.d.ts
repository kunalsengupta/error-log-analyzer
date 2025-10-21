import type { SummarizerPort } from "@ela/core";
export interface GeminiSummarizerOptions {
    apiKey?: string;
    model?: string;
    includeStackLines?: number;
    temperature?: number;
    maxRetries?: number;
    timeoutMs?: number;
}
export declare function makeGeminiSummarizer(opts?: GeminiSummarizerOptions): SummarizerPort;
//# sourceMappingURL=index.d.ts.map