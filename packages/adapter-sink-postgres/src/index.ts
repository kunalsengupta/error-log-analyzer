import type { SinkPort, AnalysisResult } from "@ela/core";
// IMPORTANT: use the generated Prisma client path from your schema:
// generator client { output = "../src/generated/prisma" }
import { PrismaClient } from "./generated/prisma/index.js";

export interface PrismaSinkOptions {
  prisma?: PrismaClient; // allow DI for tests
}

export function makePrismaSink(opts: PrismaSinkOptions = {}): SinkPort {
  const prisma = opts.prisma ?? new PrismaClient();

  return {
    async publish(r: AnalysisResult): Promise<void> {
      const e = r.events?.[0];
      if (!e) return;

      await prisma.$transaction(async (tx) => {
        // Upsert ErrorGroup by composite unique (fingerprint, service)
        const group = await tx.errorGroup.upsert({
          where: {
            // Prisma exposes a composite unique selector named by the fields: fingerprint_service
            fingerprint_service: {
              fingerprint: r.fingerprint,
              service: e.service ?? ""
            }
          },
          update: {
            lastSeen: new Date(),
            totalCount: { increment: 1 }
          },
          create: {
            fingerprint: r.fingerprint,
            service: e.service ?? null,
            totalCount: 1
          }
        });

        // Insert Event (one row per publish for now)
        await tx.event.create({
          data: {
            groupId: group.id,
            ts: e.timestamp ? new Date(e.timestamp) : new Date(),
            level: e.level ?? null,
            message: e.message,
            service: e.service ?? null,
            module: e.module ?? null,
            line: e.line ?? null,
            stack: e.stack ?? null,
            meta: (e.meta ?? null) as any
          }
        });

        // Parse structure from the current console summary text
        const parsed = parseFromSummary(r.summary);

        // Insert Analysis
        await tx.analysis.create({
          data: {
            groupId: group.id,
            createdAt: new Date(),
            level: parsed.level ?? e.level ?? null,
            priority: parsed.priority ?? null,
            title: parsed.title ?? null,
            probableCause: parsed.probableCause ?? null,
            confidence: parsed.confidence ?? null,
            filesToCheck: parsed.filesToCheck ?? [],
            checks: parsed.checks ?? [],
            commands: parsed.commands ?? [],
            fixes: parsed.fixes ?? [],
            rawSummary: r.summary
          }
        });
      });
    }
  };
}

/**
 * Lightweight parser for your current console-formatted summary.
 * If/when SummarizerPort returns structured JSON, replace this by direct assignment.
 */
function parseFromSummary(summary: string) {
  const pick = (label: string) => {
    const re = new RegExp(`^${label}:\\s*(.*)$`, "im");
    return summary.match(re)?.[1]?.trim();
  };

  // Capture a block after a label until the next non-indented line or end
  const listAfter = (label: string) => {
    const re = new RegExp(`^${label}:\\s*(?:\\(none\\)|)\\s*\\n([\\s\\S]*?)(?=^\\S|\\Z)`, "im");
    const m = summary.match(re);
    if (!m || !m[1]) return [];
    return m[1]
      .split("\n")
      .map(s => s.trim())
      .filter(s => s.startsWith("- "))
      .map(s => s.replace(/^- /, "").trim());
  };

  const title = pick("Title");
  const probableCause = pick("Probable Cause");

  // Header line looks like: "Level: error   Priority: P1   Confidence: 84%"
  const header = summary.match(/^Level:.*$/im)?.[0] ?? "";
  const level = header.match(/Level:\s*([a-z]+)/i)?.[1]?.toLowerCase();
  const priority = header.match(/Priority:\s*(P[0-3])/i)?.[1];
  const confidencePct = header.match(/Confidence:\s*(\d+)%/i)?.[1];
  const confidence = confidencePct ? Number(confidencePct) / 100 : undefined;

  const filesToCheck = listAfter("Files to Check");
  const checks = listAfter("Checks");
  const commands = listAfter("Commands");
  const fixes = listAfter("Fixes");

  return { title, probableCause, level, priority, confidence, filesToCheck, checks, commands, fixes };
}
