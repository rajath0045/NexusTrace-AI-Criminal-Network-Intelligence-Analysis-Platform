import { NextResponse } from "next/server";
import { AuthorizationError } from "@/domain/auth";
import { NotFoundError } from "@/domain/errors";
import { RateLimitError } from "@/domain/errors";
import { getCurrentActor } from "@/server/auth/session";
import { regenerateReport } from "@/server/services/report-service";
import { takeRateLimit } from "@/server/security/rate-limit";
export async function POST(_request: Request, context: { params: Promise<{ reportId: string }> }) { const actor = await getCurrentActor(); if (!actor) return NextResponse.json({ error: "Authentication is required." }, { status: 401 }); try { takeRateLimit("report", actor.userId); const { reportId } = await context.params; return NextResponse.json(await regenerateReport(actor, reportId), { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof NotFoundError ? "Report not found." : error instanceof RateLimitError ? error.message : "Unable to generate report version." }, { status: error instanceof AuthorizationError ? 403 : error instanceof NotFoundError ? 404 : error instanceof RateLimitError ? 429 : 500 }); } }
