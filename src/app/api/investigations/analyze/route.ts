import { NextResponse } from "next/server";
import { getCurrentActor } from "@/server/auth/session";
import { AuthorizationError } from "@/domain/auth";
import { NotFoundError, RateLimitError, ValidationError } from "@/domain/errors";
import { analyzeInvestigation } from "@/server/services/investigation-service";
import { takeRateLimit } from "@/server/security/rate-limit";

export async function GET(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  try {
    takeRateLimit("investigation", actor.userId);
    const analysis = await analyzeInvestigation(actor, { personId: params.get("personId") ?? "", incidentId: params.get("incidentId") ?? "", beforeDays: Number(params.get("beforeDays") ?? "7"), afterDays: Number(params.get("afterDays") ?? "2") });
    return NextResponse.json(analysis);
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof NotFoundError) return NextResponse.json({ error: "The requested investigation context is unavailable." }, { status: 404 });
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
    return NextResponse.json({ error: "Unable to load the investigation analysis." }, { status: 500 });
  }
}
