import { NextResponse } from "next/server";
import { AuthorizationError } from "@/domain/auth";
import { ValidationError } from "@/domain/errors";
import { getCurrentActor } from "@/server/auth/session";
import { listAdministrationUsers } from "@/server/services/administration-service";

export async function GET(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  try {
    return NextResponse.json(await listAdministrationUsers(actor, Object.fromEntries(new URL(request.url).searchParams)), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : error instanceof ValidationError ? 400 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load operators." }, { status });
  }
}
