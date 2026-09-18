import { NextResponse } from "next/server";
import { AuthorizationError } from "@/domain/auth";
import { NotFoundError, ValidationError } from "@/domain/errors";
import { getCurrentActor } from "@/server/auth/session";
import { reviewInvestigationFinding } from "@/server/services/investigation-service";
export async function POST(request: Request, context: { params: Promise<{ findingId: string }> }) { const actor = await getCurrentActor(); if (!actor) return NextResponse.json({ error: "Authentication is required." }, { status: 401 }); try { const { findingId } = await context.params; return NextResponse.json(await reviewInvestigationFinding(actor, findingId, await request.json())); } catch (error) { const status = error instanceof AuthorizationError ? 403 : error instanceof NotFoundError ? 404 : error instanceof ValidationError ? 400 : 500; return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to review finding." }, { status }); } }
