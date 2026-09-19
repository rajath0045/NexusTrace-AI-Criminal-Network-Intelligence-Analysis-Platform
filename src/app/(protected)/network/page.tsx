import { redirect } from "next/navigation";
import { RelationshipStrength, VerificationState } from "@/domain/model";
import { serializeGeographicProjection } from "@/features/graph/geographic-view-model";
import { NetworkExplorer } from "@/features/graph/network-explorer";
import { getCurrentActor } from "@/server/auth/session";
import { can } from "@/server/authorization/policy";
import { getGeographicProjection } from "@/server/services/geography-service";
import { getDefaultGraphFocus, getGraphEntity } from "@/server/services/graph-service";
import { getWorkspaceLayout } from "@/server/services/workspace-layout-service";

export default async function NetworkPage({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");

  const requestedFocus = (await searchParams).focus;
  let focus;
  try {
    focus = requestedFocus ? await getGraphEntity(actor, requestedFocus) : await getDefaultGraphFocus(actor);
  } catch {
    // A direct inaccessible or malformed focus uses the actor's normal graph start point.
    // This preserves the same non-disclosing behavior as the graph API.
    focus = await getDefaultGraphFocus(actor);
  }
  const [projection, layout] = await Promise.all([
    getGeographicProjection(actor, {
      focusEntityId: focus.id,
      hops: 1,
      strengths: [RelationshipStrength.Primary],
      verificationStates: [VerificationState.Verified],
      allowedLocationWindowMinutes: 180,
    }),
    getWorkspaceLayout(actor, "graph"),
  ]);

  const actions = {
    canSubmitIncident: can(actor, "INCIDENT_SUBMIT"),
    canCreateIncident: can(actor, "INCIDENT_CREATE"),
    canReviewIncident: can(actor, "INCIDENT_REVIEW"),
    canCrossVerify: can(actor, "INCIDENT_CROSS_VERIFY"),
    canReviewFinding: can(actor, "FINDING_REVIEW"),
  };

  return <div className="page-stack network-page"><header className="page-header network-page-header"><div><p className="eyebrow">Authorized geographic intelligence</p><h1>Network console</h1><p>Temporal locations, relationship context, and evidence-backed investigative pivots in one synchronized view.</p></div></header><NetworkExplorer initialProjection={serializeGeographicProjection(projection)} initialLayoutItems={layout.items} actions={actions} /></div>;
}
