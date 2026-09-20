import { NextResponse } from "next/server";
import { AuthorizationError } from "@/domain/auth";
import { NotFoundError, ValidationError } from "@/domain/errors";
import { getCurrentActor } from "@/server/auth/session";
import { generateReport, listReports } from "@/server/services/report-service";

export async function GET(request: Request) { const actor = await getCurrentActor(); if (!actor) return NextResponse.json({ error: "Authentication is required." }, { status: 401 }); try { return NextResponse.json(await listReports(actor, Object.fromEntries(new URL(request.url).searchParams)), { headers: { "Cache-Control": "private, no-store" } }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load reports." }, { status: error instanceof AuthorizationError ? 403 : error instanceof ValidationError ? 400 : 500 }); } }
export async function POST(request: Request) { const actor = await getCurrentActor(); if (!actor) return NextResponse.json({ error: "Authentication is required." }, { status: 401 }); try { return NextResponse.json(await generateReport(actor, await request.json()), { status: 201, headers: { "Cache-Control": "private, no-store" } }); } catch (error) { const status = error instanceof AuthorizationError ? 403 : error instanceof NotFoundError ? 404 : error instanceof ValidationError ? 400 : 500; return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to generate report." }, { status }); } }
