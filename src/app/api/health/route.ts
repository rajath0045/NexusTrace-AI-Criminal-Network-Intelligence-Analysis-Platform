import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { operationalLog } from "@/server/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ application: "ok", database: "ok", version: process.env.APP_VERSION ?? "unknown" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    operationalLog.error("health.database_unavailable", { message: error instanceof Error ? error.message : "Unknown database error" });
    return NextResponse.json({ application: "degraded", database: "unavailable", version: process.env.APP_VERSION ?? "unknown" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
