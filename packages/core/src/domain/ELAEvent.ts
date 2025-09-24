export type ELALevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";


/** Minimal normalized event shape */
export interface ELAEvent {
timestamp?: string; // ISO string
level?: ELALevel;
message: string;
service?: string;
logger?: string; // e.g., "winston", "pino", "sentry"
module?: string; // e.g., file/module name
line?: number;
stack?: string;
meta?: Record<string, unknown>;
}


export interface AnalysisSuggestion {
title: string; // e.g., "Database connection failed"
fix?: string; // e.g., "Check connection string & firewall"
source?: "kb" | "llm" | "rule";
score?: number; // ranking score (0-1)
}


export interface AnalysisResult {
fingerprint: string; // stable grouping key
summary: string; // one-liner human summary
suggestions: AnalysisSuggestion[];
events: ELAEvent[]; // events that produced this result (batched)
}