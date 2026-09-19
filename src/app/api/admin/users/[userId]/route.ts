import { NextResponse } from "next/server";
import { AuthorizationError } from "@/domain/auth";
import { ConflictError, NotFoundError, ValidationError } from "@/domain/errors";
import { getCurrentActor } from "@/server/auth/session";
import { updateAdministrationUser } from "@/server/services/administration-service";

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  try {
    const { userId } = await context.params;
    await updateAdministrationUser(actor, userId, await request.json());
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : error instanceof NotFoundError ? 404 : error instanceof ConflictError ? 409 : error instanceof ValidationError ? 400 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update operator." }, { status });
  }
}
