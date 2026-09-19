import { NextResponse } from "next/server";
import { AuthorizationError } from "@/domain/auth";
import { NotFoundError } from "@/domain/errors";
import { getCurrentActor } from "@/server/auth/session";
import { getInvestigationFinding } from "@/server/services/investigation-service";
export async function GET(_request: Request, context: { params: Promise<{ findingId: string }> }) { const actor = await getCurrentActor(); if (!actor) return NextResponse.json({ error: "Authentication is required." }, { status: 401 }); try { const { findingId } = await context.params; return NextResponse.json(await getInvestigationFinding(actor, findingId), { headers: { "Cache-Control": "private, no-store" } }); } catch (error) { return NextResponse.json({ error: "The requested finding is unavailable." }, { status: error instanceof AuthorizationError ? 403 : error instanceof NotFoundError ? 404 : 500 }); } }
