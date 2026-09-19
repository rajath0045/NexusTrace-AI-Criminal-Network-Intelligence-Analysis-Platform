import { LocationObservationType, RelationshipStrength, VerificationState } from "@/domain/model";
import { serializeGeographicProjection } from "@/features/graph/geographic-view-model";
import { getCurrentActor } from "@/server/auth/session";
import { getGeographicProjection } from "@/server/services/geography-service";

function parseList<T extends string>(value: string | null, allowed: readonly T[]): T[] | undefined {
  if (!value) return undefined;
  const parts = value.split(",");
  const values = parts.filter((item): item is T => allowed.includes(item as T));
  return values.length === parts.length && values.length > 0 ? values : undefined;
}

function optionalDate(value: string | null): Date | undefined {
  return value ? new Date(value) : undefined;
}

export async function GET(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return new Response("Authentication required.", { status: 401 });
  const search = new URL(request.url).searchParams;
  const focusEntityId = search.get("focus");
  if (!focusEntityId) return new Response("Geographic request is invalid.", { status: 400 });

  try {
    const projection = await getGeographicProjection(actor, {
      focusEntityId,
      hops: Number(search.get("hops") ?? 1),
      strengths: parseList(search.get("strengths"), Object.values(RelationshipStrength)) ?? [RelationshipStrength.Primary],
      verificationStates: parseList(search.get("verificationStates"), Object.values(VerificationState)) ?? [VerificationState.Verified],
      observationTypes: parseList(search.get("observationTypes"), Object.values(LocationObservationType)),
      startTime: optionalDate(search.get("startTime")),
      endTime: optionalDate(search.get("endTime")),
      allowedLocationWindowMinutes: Number(search.get("allowedLocationWindowMinutes") ?? 180),
    });
    return Response.json(serializeGeographicProjection(projection));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "NOT_FOUND" || error.code === "FORBIDDEN") return new Response("Geographic investigation context not found.", { status: 404 });
      if (error.code === "VALIDATION") return new Response("Geographic request is invalid.", { status: 400 });
    }
    return new Response("Geographic investigation request failed.", { status: 500 });
  }
}
