import Transport from "winston-transport";
import type winston from "winston";
import type { Analyzer } from "@ela/core";
export interface ELAWinstonTransportOptions extends Transport.TransportStreamOptions {
    level?: string;
    service?: string;
}
export declare class ELAWinstonTransport extends Transport {
    private analyzer;
    private service?;
    constructor(analyzer: Analyzer, opts?: ELAWinstonTransportOptions);
    log(info: winston.Logform.TransformableInfo, next: () => void): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map