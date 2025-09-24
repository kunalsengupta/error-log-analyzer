import { createAnalyzer } from "./analyzer/createAnalyzer.js";
const analyzer = createAnalyzer();
const evt = {
    timestamp: new Date().toISOString(),
    level: "error",
    message: "ConnectionTimeoutError at db.ts:45",
    logger: "dev",
    stack: "Error:ConnectionTimeoutError at db.ts:45\n at connect (db.ts:30)",
};
analyzer.ingest(evt);
console.log("Event ingested in dev mode");
//# sourceMappingURL=dev.js.map