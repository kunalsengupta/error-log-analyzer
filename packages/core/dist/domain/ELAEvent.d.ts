export type ELALevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";
/** Minimal normalized event shape */
export interface ELAEvent {
    timestamp?: string;
    level?: ELALevel;
    message: string;
    service?: string;
    logger?: string;
    module?: string;
    line?: number;
    stack?: string;
    meta?: Record<string, unknown>;
}
export interface AnalysisSuggestion {
    title: string;
    fix?: string;
    source?: "kb" | "llm" | "rule";
    score?: number;
}
export interface AnalysisResult {
    fingerprint: string;
    summary: string;
    suggestions: AnalysisSuggestion[];
    events: ELAEvent[];
}
//# sourceMappingURL=ELAEvent.d.ts.map