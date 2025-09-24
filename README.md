# AI-Powered Error Log Analyzer (ELA)

Developer-first, pluggable error analysis for Node.js apps.

Drop in a transport for your logger (starting with Winston), and get LLM-generated summaries, probable root causes, and actionable fixes. Works locally, in CI, or as part of your observability stack.

**MVP focus:** Parse app errors → summarize → suggest checks/fixes.

**Design:** Ports & Adapters (clean architecture) so you can swap LLM providers (Gemini, OpenAI, Vertex, OPEA) and sinks (Console, PostgreSQL/MySQL, etc.).

## Features (MVP)

- Integration with Winston logger through a custom transport
- **Summarizer adapters:**
  - `@ela/adapter-gemini` (default, free dev tier)
  - (optional) `@ela/adapter-openai` / `@ela/adapter-vertex`
- Actionable output: summary, probable cause, prioritized fix list
- Ports & Adapters design for Summarizer, Knowledge Base (KB), and Sinks
- Console sink (MVP)
- **Planned sinks:** PostgreSQL/MySQL for persistent storage
- CLI package scaffolded (no-op build/dev scripts for now)
- Dashboard prototype prepared (Ant Design)

## Monorepo Layout (npm workspaces)

```
error-log-analyzer/
├─ package.json
├─ package-lock.json
├─ tsconfig.base.json
├─ .gitignore
└─ packages/
   ├─ adapter-gemini/
   │  ├─ src/
   │  │  ├─ index.ts
   │  │  └─ dev.ts
   │  ├─ dist/                ← created by `npm run build`
   │  ├─ package.json
   │  └─ tsconfig.json
   ├─ adapter-winston/
   │  ├─ src/ …
   │  ├─ package.json
   │  └─ tsconfig.json
   ├─ cli/
   │  ├─ package.json
   │  └─ tsconfig.json
   └─ core/
      ├─ src/
      │  ├─ analyzer/
      │  ├─ domain/
      │  ├─ ports/
      │  ├─ dev.ts
      │  └─ index.ts
      ├─ dist/                ← created by `npm run build`
      ├─ package.json
      └─ tsconfig.json
```

## Tech Stack

- **Core:** Node.js + TypeScript
- **Pattern:** Ports & Adapters (Hexagonal)
- **Logging:** Winston (first adapter)
- **LLM:** Google Gemini (`@google/generative-ai`)
- **Build/Dev:** TypeScript + tsx
- **Config:** .env file inside each package

## Quickstart

### 1) Clone & install

```bash
git clone <your-repo-url> error-log-analyzer
cd error-log-analyzer
npm install
```

### 2) Environment

Each package has its own `.env`. Example (`packages/adapter-gemini/.env`):

```bash
GEMINI_API_KEY=your-gemini-key
```

### 3) Build all workspaces

```bash
npm run build
```

### 4) Run core dev harness (single event test)

```bash
npm run dev:core
```

**Example output:**
```
Error Group: connectiontimeouterror
Summary: ConnectionTimeoutError at db.ts:45
Suggested Fix: Check DB connection string, network reachability, and firewall rules.
```

### 5) Run Gemini adapter harness

```bash
npm run dev:gemini
```

**Example output (varies by model):**
```
Title: Redis connection refused
Probable Cause: The app cannot reach Redis on 127.0.0.1:6379; the service is down or not listening.
Level: error   Priority: P1   Confidence: 84%
Files to Check:
 - src/redis.ts
 - docker-compose.yml
 - .env (REDIS_URL)
Checks:
 - lsof -i :6379
 - redis-cli -h 127.0.0.1 -p 6379 ping
Commands:
 - systemctl status redis || docker logs <redis-container>
Fixes:
 - Start Redis service/container
 - Ensure port 6379 is exposed and reachable
 - Update REDIS_URL in configuration
```

### 6) Run Winston adapter harness

```bash
npm run dev:winston
```

Your app's Winston errors will be analyzed and summarized.

## Using in your app (Winston)

```javascript
import winston from "winston";
import { createAnalyzer } from "@ela/core";
import { ELAWinstonTransport } from "@ela/adapter-winston";
import { makeGeminiSummarizer } from "@ela/adapter-gemini";

const analyzer = createAnalyzer({
  summarizer: makeGeminiSummarizer(), // requires GEMINI_API_KEY in package .env
});

const logger = winston.createLogger({
  level: "info",
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
    new ELAWinstonTransport(analyzer, { level: "error" })
  ]
});

logger.error("ConnectionTimeoutError at db.ts:45", { 
  stack: "Error...\n  at connect (db.ts:45:10)" 
});
```

## Config

Choose provider via `ELA_PROVIDER`:

```bash
ELA_PROVIDER=gemini npm run dev:winston
ELA_PROVIDER=openai npm run dev:winston
ELA_PROVIDER=vertex npm run dev:winston
```

## Architecture

**Domain types:** `ELAEvent`, `AnalysisResult`, `AnalysisSuggestion`

**Ports:**
- `SummarizerPort` → summarize logs
- `KnowledgeBasePort` → lookup fixes/patterns
- `SinkPort` → publish results (console, DB, etc.)

**Adapters:**
- `adapter-winston` → Winston → ELAEvent
- `adapter-gemini` → Gemini summarizer
- (future) `adapter-openai`, `adapter-vertex`, `adapter-opea`
- (future) DB sinks for PostgreSQL/MySQL

**Flow (MVP):**
```
Winston → ELAWinstonTransport → Analyzer.ingest()
  → fingerprint → summarizer (Gemini) → KB lookup
  → sinks (Console; DB later)
```

## Roadmap

### MVP → V1
- PostgreSQL/MySQL sink to persist results
- CLI: `ela analyze ./logs/app.log`
- KB enrichment: common error mappings (ECONNREFUSED, ETIMEDOUT, etc.)

### V1 → V2
- Dashboard UI backed by DB sink
- Error batching + grouping
- Security: PII scrubber, token budgeting
- Optional providers: OpenAI, Vertex, OPEA
