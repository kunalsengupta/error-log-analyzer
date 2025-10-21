import Transport from "winston-transport";
import type winston from "winston";
import type { Analyzer,ELAEvent } from "@ela/core";

export interface ELAWinstonTransportOptions extends Transport.TransportStreamOptions {
  level?: string; // default: "error"
  service?: string; // default: "unknown"
}

export class ELAWinstonTransport extends Transport {
  private analyzer: Analyzer;
  private service?: string;


  constructor(analyzer: Analyzer,opts: ELAWinstonTransportOptions = {}) {
    super({level: opts.level ?? "error"});
    this.analyzer = analyzer;
    this.service = opts.service ?? "unknown";
  }


  override async log(info: winston.Logform.TransformableInfo,next:()=>void) {
    setImmediate(() => this.emit("logged", info));


    const event: ELAEvent = {
      timestamp: new Date().toISOString(),
      level: (info.level || "error") as any,
      message: info.message === "string" ? info.message : JSON.stringify(info.message),
      service: this.service ?? "unknown",
      logger: "winston",
      stack: (info as any).stack || (info as any).error?.stack || (info as any).err?.stack,
      meta: info
    };



    try {
      await this.analyzer.ingest(event)
    } catch (e) {
      // don't crash the app if analyzer fails
      // esLint-disable-next-line no-console
      console.error("Error ingesting event to ELA:", e);
    }

    next();
  }
}
