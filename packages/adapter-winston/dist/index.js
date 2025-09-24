import Transport from "winston-transport";
export class ELAWinstonTransport extends Transport {
    analyzer;
    constructor(analyzer, opts) {
        super(opts);
        this.analyzer = analyzer;
    }
    async log(info, callback) {
        setImmediate(() => this.emit("logged", info));
        try {
            const evt = {
                timestamp: new Date().toISOString(),
                level: info.level ?? "info",
                message: String(info.message ?? ""),
                logger: "winston",
                stack: typeof info.stack === "string" ? info.stack : undefined,
                meta: info
            };
            // fire-and-forget; never throw inside transport
            this.analyzer.ingest(evt).catch(() => { });
        }
        finally {
            callback();
        }
    }
}
//# sourceMappingURL=index.js.map