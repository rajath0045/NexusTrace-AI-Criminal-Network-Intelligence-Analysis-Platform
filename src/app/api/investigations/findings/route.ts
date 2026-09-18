import { NextResponse } from "next/server";
import { AuthorizationError } from "@/domain/auth";
import { ValidationError } from "@/domain/errors";
import { getCurrentActor } from "@/server/auth/session";
import { listInvestigationFindings } from "@/server/services/investigation-service";
import { FindingReviewStatus } from "@/domain/model";
export async function GET(request: Request) { const actor = await getCurrentActor(); if (!actor) return NextResponse.json({ error: "Authentication is required." }, { status: 401 }); try { const p = new URL(request.url).searchParams; return NextResponse.json(await listInvestigationFindings(actor, { status: p.get("status") as FindingReviewStatus | undefined, category: p.get("category") ?? undefined, caseId: p.get("caseId") ?? undefined, incidentId: p.get("incidentId") ?? undefined, personId: p.get("personId") ?? undefined })); } catch (error) { return NextResponse.json({ error: error instanceof ValidationError || error instanceof AuthorizationError ? error.message : "Unable to load findings." }, { status: error instanceof AuthorizationError ? 403 : 400 }); } }
