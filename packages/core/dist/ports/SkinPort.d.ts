import type { AnalysisResult } from "../domain/ELAEvent.js";
export interface SinkPort {
    publish(result: AnalysisResult): Promise<void>;
}
//# sourceMappingURL=SkinPort.d.ts.map