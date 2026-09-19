import { NextResponse } from "next/server";
import { AuthorizationError } from "@/domain/auth";
import { ValidationError } from "@/domain/errors";
import { getCurrentActor } from "@/server/auth/session";
import { listInvestigationFindings } from "@/server/services/investigation-service";
import { findingQueueQuerySchema } from "@/domain/investigation";

export async function GET(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  try {
    const p = new URL(request.url).searchParams;
    const parsed = findingQueueQuerySchema.safeParse(Object.fromEntries(p));
    if (!parsed.success) throw new ValidationError("The finding filters are invalid.");
    return NextResponse.json(await listInvestigationFindings(actor, parsed.data), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof ValidationError || error instanceof AuthorizationError ? error.message : "Unable to load findings." }, { status: error instanceof AuthorizationError ? 403 : error instanceof ValidationError ? 400 : 500 });
  }
}
