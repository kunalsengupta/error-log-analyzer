import Transport from "winston-transport";
export class ELAWinstonTransport extends Transport {
    analyzer;
    service;
    constructor(analyzer, opts = {}) {
        super({ level: opts.level ?? "error" });
        this.analyzer = analyzer;
        this.service = opts.service ?? "unknown";
    }
    async log(info, next) {
        setImmediate(() => this.emit("logged", info));
        const event = {
            timestamp: new Date().toISOString(),
            level: (info.level || "error"),
            message: info.message === "string" ? info.message : JSON.stringify(info.message),
            service: this.service ?? "unknown",
            logger: "winston",
            stack: info.stack || info.error?.stack || info.err?.stack,
            meta: info
        };
        try {
            await this.analyzer.ingest(event);
        }
        catch (e) {
            // don't crash the app if analyzer fails
            // esLint-disable-next-line no-console
            console.error("Error ingesting event to ELA:", e);
        }
        next();
    }
}
//# sourceMappingURL=index.js.map