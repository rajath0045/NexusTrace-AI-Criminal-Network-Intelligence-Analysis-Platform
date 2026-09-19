import { NextResponse } from "next/server";
import { AuthorizationError } from "@/domain/auth";
import { getCurrentActor } from "@/server/auth/session";
import { listAdministrationDepartments } from "@/server/services/administration-service";

export async function GET() {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  try { return NextResponse.json(await listAdministrationDepartments(actor), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load departments." }, { status: error instanceof AuthorizationError ? 403 : 500 }); }
}
