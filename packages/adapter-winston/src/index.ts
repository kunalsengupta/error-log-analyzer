import Transport from "winston-transport";
import type winston from "winston";
import type { Analyzer } from "@ela/core";
import type { ELAEvent } from "@ela/core";

export class ELAWinstonTransport extends Transport {
  constructor(private analyzer: Analyzer, opts?: Transport.TransportStreamOptions) {
    super(opts);
  }

  override async log(info: winston.Logform.TransformableInfo, callback: () => void) {
    setImmediate(() => this.emit("logged", info));
    try {
      const evt: ELAEvent = {
        timestamp: new Date().toISOString(),
        level: (info.level as any) ?? "info",
        message: String(info.message ?? ""),
        logger: "winston",
        stack: typeof (info as any).stack === "string" ? (info as any).stack : undefined,
        meta: info
      };
      // fire-and-forget; never throw inside transport
      this.analyzer.ingest(evt).catch(() => {});
    } finally {
      callback();
    }
  }
}
