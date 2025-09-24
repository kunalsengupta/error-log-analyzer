import type { ELAEvent } from "../domain/ELAEvent.js";
export interface SummarizerPort {
    summarize(events: ELAEvent[], hint?: string): Promise<string>;
}
//# sourceMappingURL=SummarizePort.d.ts.map