import { NextResponse } from "next/server";
import { AuthorizationError } from "@/domain/auth";
import { NotFoundError, RateLimitError, ValidationError } from "@/domain/errors";
import { getCurrentActor } from "@/server/auth/session";
import { generateReport, listReports } from "@/server/services/report-service";
import { operationalLog } from "@/server/observability/logger";
import { takeRateLimit } from "@/server/security/rate-limit";

export async function GET(request: Request) { const actor = await getCurrentActor(); if (!actor) return NextResponse.json({ error: "Authentication is required." }, { status: 401 }); try { return NextResponse.json(await listReports(actor, Object.fromEntries(new URL(request.url).searchParams)), { headers: { "Cache-Control": "private, no-store" } }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load reports." }, { status: error instanceof AuthorizationError ? 403 : error instanceof ValidationError ? 400 : 500 }); } }
export async function POST(request: Request) { const actor = await getCurrentActor(); if (!actor) return NextResponse.json({ error: "Authentication is required." }, { status: 401 }); try { takeRateLimit("report", actor.userId); return NextResponse.json(await generateReport(actor, await request.json()), { status: 201, headers: { "Cache-Control": "private, no-store" } }); } catch (error) { const status = error instanceof AuthorizationError ? 403 : error instanceof NotFoundError ? 404 : error instanceof ValidationError ? 400 : error instanceof RateLimitError ? 429 : 500; if (status >= 500) operationalLog.error("report.generation_failed", { actorId: actor.userId, message: error instanceof Error ? error.message : "Unknown error" }); return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to generate report." }, { status }); } }
