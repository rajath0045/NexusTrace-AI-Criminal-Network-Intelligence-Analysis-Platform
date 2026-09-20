import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { operationalLog } from "@/server/observability/logger";
import { verifyNeo4jConnection } from "@/server/graph/neo4j-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const graph = await verifyNeo4jConnection().catch(() => "unavailable" as const);
    return NextResponse.json({ application: graph === "unavailable" ? "degraded" : "ok", database: "ok", graph, version: process.env.APP_VERSION ?? "unknown" }, { status: graph === "unavailable" ? 503 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    operationalLog.error("health.database_unavailable", { message: error instanceof Error ? error.message : "Unknown database error" });
    return NextResponse.json({ application: "degraded", database: "unavailable", version: process.env.APP_VERSION ?? "unknown" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
