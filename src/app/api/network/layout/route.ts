import { graphIdSchema } from "@/domain/graph";
import { getCurrentActor } from "@/server/auth/session";
import { getGraphEntity } from "@/server/services/graph-service";
import { getGraphPresentation, resetGraphPresentation, saveGraphPresentation } from "@/server/services/graph-layout-service";

async function actorAndFocus(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return null;
  const focus = new URL(request.url).searchParams.get("focus");
  if (!focus || !graphIdSchema.safeParse(focus).success) return null;
  // Authorize the context using the canonical policy before accessing a
  // per-user presentation record; a UUID alone cannot reveal its existence.
  await getGraphEntity(actor, focus);
  return { actor, focus };
}

export async function GET(request: Request) {
  try {
    const context = await actorAndFocus(request);
    if (!context) return new Response("Graph layout context not found.", { status: 404 });
    return Response.json(await getGraphPresentation(context.actor, context.focus));
  } catch { return new Response("Graph layout context not found.", { status: 404 }); }
}

export async function PUT(request: Request) {
  try {
    const context = await actorAndFocus(request);
    if (!context) return new Response("Graph layout context not found.", { status: 404 });
    return Response.json(await saveGraphPresentation(context.actor, context.focus, await request.json()));
  } catch { return new Response("Graph layout is invalid.", { status: 400 }); }
}

export async function DELETE(request: Request) {
  try {
    const context = await actorAndFocus(request);
    if (!context) return new Response("Graph layout context not found.", { status: 404 });
    return Response.json(await resetGraphPresentation(context.actor, context.focus));
  } catch { return new Response("Graph layout context not found.", { status: 404 }); }
}
