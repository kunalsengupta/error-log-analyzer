import type { ELAEvent } from "../domain/ELAEvent.js";


export interface SummarizerPort {
summarize(events: ELAEvent[], hint?: string): Promise<string>;
}