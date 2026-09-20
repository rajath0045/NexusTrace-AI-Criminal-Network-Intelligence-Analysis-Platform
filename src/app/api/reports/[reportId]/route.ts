import { NextResponse } from "next/server";
import { AuthorizationError } from "@/domain/auth";
import { NotFoundError } from "@/domain/errors";
import { getCurrentActor } from "@/server/auth/session";
import { getReport } from "@/server/services/report-service";
export async function GET(request: Request, context: { params: Promise<{ reportId: string }> }) { const actor = await getCurrentActor(); if (!actor) return NextResponse.json({ error: "Authentication is required." }, { status: 401 }); try { const { reportId } = await context.params; const value = new URL(request.url).searchParams.get("version"); return NextResponse.json(await getReport(actor, reportId, value ? Number(value) : undefined), { headers: { "Cache-Control": "private, no-store" } }); } catch (error) { return NextResponse.json({ error: error instanceof NotFoundError ? "Report not found." : "Unable to load report." }, { status: error instanceof AuthorizationError ? 403 : error instanceof NotFoundError ? 404 : 500 }); } }
