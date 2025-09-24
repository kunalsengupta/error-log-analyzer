import "dotenv/config";
import { makeGeminiSummarizer } from "./index.js";
const summarizer = makeGeminiSummarizer();
console.log("CWD:", process.cwd());
(async () => {
    const text = await summarizer.summarize([
        { message: "ECONNREFUSED 127.0.0.1:6379", level: "error" },
    ]);
    console.log("Gemini summary:", text);
})();
//# sourceMappingURL=dev.js.map