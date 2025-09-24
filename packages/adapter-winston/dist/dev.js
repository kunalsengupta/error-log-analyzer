import winston from "winston";
import { createAnalyzer } from "@ela/core";
import { ELAWinstonTransport } from "./index.js";
const analyzer = createAnalyzer();
const logger = winston.createLogger({
    level: "info",
    transports: [
        new winston.transports.Console({ format: winston.format.simple() }),
        new ELAWinstonTransport(analyzer, { level: "error" }) // only forward errors
    ]
});
// test
logger.info("Hello (info) — should NOT trigger analyzer");
logger.error("ConnectionTimeoutError at db.ts:45", { stack: "Error...\n  at connect (db.ts:45:10)" });
//# sourceMappingURL=dev.js.map