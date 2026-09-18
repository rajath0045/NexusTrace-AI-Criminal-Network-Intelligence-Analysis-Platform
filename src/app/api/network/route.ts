import { defaultGraphFilters, graphFiltersSchema } from "@/domain/graph";
import { RelationshipStrength, VerificationState } from "@/domain/model";
import { serializeGraphNeighborhood } from "@/features/graph/graph-view-model";
import { getCurrentActor } from "@/server/auth/session";
import { getNeighborhood } from "@/server/services/graph-service";

function parseList<T extends string>(value: string | null, allowed: readonly T[]): T[] | undefined {
  if (!value) return undefined;
  const values = value.split(",").filter((item): item is T => allowed.includes(item as T));
  return values.length === value.split(",").length && values.length > 0 ? values : undefined;
}

export async function GET(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return new Response("Authentication required.", { status: 401 });

  const search = new URL(request.url).searchParams;
  const focus = search.get("focus");
  const filters = {
    hops: Number(search.get("hops") ?? defaultGraphFilters.hops),
    strengths: parseList(search.get("strengths"), Object.values(RelationshipStrength)) ?? defaultGraphFilters.strengths,
    verificationStates: parseList(search.get("verificationStates"), Object.values(VerificationState)) ?? defaultGraphFilters.verificationStates,
  };

  if (!focus || !graphFiltersSchema.safeParse(filters).success) {
    return new Response("Graph request is invalid.", { status: 400 });
  }

  try {
    return Response.json(serializeGraphNeighborhood(await getNeighborhood(actor, focus, filters)));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "NOT_FOUND" || error.code === "FORBIDDEN") {
        return new Response("Graph entity not found.", { status: 404 });
      }
      if (error.code === "VALIDATION") return new Response("Graph request is invalid.", { status: 400 });
    }
    return new Response("Graph request failed.", { status: 500 });
  }
}
