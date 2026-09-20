import { prisma } from "@/server/db/client";
import { operationalLog } from "@/server/observability/logger";
import { initializeNeo4jSchema, projectCanonicalGraph } from "@/server/graph/neo4j-projection";

/**
 * Drains the transactional PostgreSQL outbox. A failed graph write never
 * invalidates canonical investigative data; it remains observable and retryable.
 */
export async function processGraphProjectionOutbox(limit = 50): Promise<{ processed: number; failed: number }> {
  const events = await prisma.graphProjectionEvent.findMany({
    where: { processedAt: null, availableAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" }, take: Math.min(limit, 100),
  });
  if (events.length === 0) return { processed: 0, failed: 0 };

  try {
    await initializeNeo4jSchema();
    await projectCanonicalGraph();
    await prisma.graphProjectionEvent.updateMany({
      where: { id: { in: events.map((event) => event.id) } },
      data: { processedAt: new Date(), lastError: null, attempts: { increment: 1 } },
    });
    return { processed: events.length, failed: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1_000) : "Unknown Neo4j projection failure";
    await prisma.graphProjectionEvent.updateMany({
      where: { id: { in: events.map((event) => event.id) } },
      data: { attempts: { increment: 1 }, lastError: message, availableAt: new Date(Date.now() + 60_000) },
    });
    operationalLog.error("graph.projection_failed", { eventCount: events.length, message });
    return { processed: 0, failed: events.length };
  }
}
