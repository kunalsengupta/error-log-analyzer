import Transport from "winston-transport";
import type winston from "winston";
import type { Analyzer } from "@ela/core";
export declare class ELAWinstonTransport extends Transport {
    private analyzer;
    constructor(analyzer: Analyzer, opts?: Transport.TransportStreamOptions);
    log(info: winston.Logform.TransformableInfo, callback: () => void): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map