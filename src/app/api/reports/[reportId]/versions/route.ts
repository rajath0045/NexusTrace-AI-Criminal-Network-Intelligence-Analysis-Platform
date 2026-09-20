import { NextResponse } from "next/server";
import { AuthorizationError } from "@/domain/auth";
import { NotFoundError } from "@/domain/errors";
import { getCurrentActor } from "@/server/auth/session";
import { regenerateReport } from "@/server/services/report-service";
export async function POST(_request: Request, context: { params: Promise<{ reportId: string }> }) { const actor = await getCurrentActor(); if (!actor) return NextResponse.json({ error: "Authentication is required." }, { status: 401 }); try { const { reportId } = await context.params; return NextResponse.json(await regenerateReport(actor, reportId), { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof NotFoundError ? "Report not found." : "Unable to generate report version." }, { status: error instanceof AuthorizationError ? 403 : error instanceof NotFoundError ? 404 : 500 }); } }
