import { NextResponse } from "next/server";
import { AuthorizationError } from "@/domain/auth";
import { getCurrentActor } from "@/server/auth/session";
import { getFindingMetrics } from "@/server/services/investigation-service";
export async function GET() { const actor = await getCurrentActor(); if (!actor) return NextResponse.json({ error: "Authentication is required." }, { status: 401 }); try { return NextResponse.json(await getFindingMetrics(actor), { headers: { "Cache-Control": "private, no-store" } }); } catch (error) { return NextResponse.json({ error: "Unable to load authorized review metrics." }, { status: error instanceof AuthorizationError ? 403 : 500 }); } }
