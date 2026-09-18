import { serializeRelationshipDetail } from "@/features/graph/graph-view-model";
import { getCurrentActor } from "@/server/auth/session";
import { getRelationshipDetail } from "@/server/services/graph-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ relationshipId: string }> },
) {
  const actor = await getCurrentActor();
  if (!actor) return new Response("Authentication required.", { status: 401 });

  try {
    const detail = await getRelationshipDetail(actor, (await params).relationshipId);
    return Response.json(serializeRelationshipDetail(detail));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "NOT_FOUND" || error.code === "FORBIDDEN") {
        return new Response("Connection not found.", { status: 404 });
      }
    }
    return new Response("Connection request failed.", { status: 500 });
  }
}
