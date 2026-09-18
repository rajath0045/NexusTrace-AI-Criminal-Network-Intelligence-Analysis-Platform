import { NextResponse } from "next/server";
import { getCurrentActor } from "@/server/auth/session";
import { AuthorizationError } from "@/domain/auth";
import { NotFoundError, ValidationError } from "@/domain/errors";
import { answerInvestigationQuestion } from "@/server/services/investigation-service";

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  try {
    const body = await request.json();
    const answer = await answerInvestigationQuestion(actor, body);
    return NextResponse.json(answer);
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof NotFoundError) return NextResponse.json({ error: "The requested investigation context is unavailable." }, { status: 404 });
    return NextResponse.json({ error: "Unable to answer this controlled investigation question." }, { status: 500 });
  }
}
