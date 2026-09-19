import { NextResponse } from "next/server";
import { AuthorizationError } from "@/domain/auth";
import { ValidationError } from "@/domain/errors";
import { getCurrentActor } from "@/server/auth/session";
import { searchAuthorizedRecords } from "@/server/services/search-service";

export async function GET(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  try {
    return NextResponse.json(await searchAuthorizedRecords(actor, { q: new URL(request.url).searchParams.get("q") ?? "" }), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : error instanceof ValidationError ? 400 : 500;
    return NextResponse.json({ error: error instanceof ValidationError || error instanceof AuthorizationError ? error.message : "Unable to search authorized records." }, { status });
  }
}
