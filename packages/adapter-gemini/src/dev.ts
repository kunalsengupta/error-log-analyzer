import "dotenv/config";
import { makeGeminiSummarizer } from "./index.js";
import type { ELAEvent } from "@ela/core";

const summarizer = makeGeminiSummarizer();
console.log("CWD:", process.cwd());

(async () => {
  const text = await summarizer.summarize([
    { message: "ECONNREFUSED 127.0.0.1:6379", level: "error" } as ELAEvent,
  ]);
  console.log("Gemini summary:", text);
})();
