import { redirect } from "next/navigation";
import { RelationshipStrength, VerificationState } from "@/domain/model";
import { serializeGeographicProjection } from "@/features/graph/geographic-view-model";
import { NetworkExplorer } from "@/features/graph/network-explorer";
import { getCurrentActor } from "@/server/auth/session";
import { getGeographicProjection } from "@/server/services/geography-service";
import { getDefaultGraphFocus } from "@/server/services/graph-service";
import { getWorkspaceLayout } from "@/server/services/workspace-layout-service";

export default async function NetworkPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");

  const focus = await getDefaultGraphFocus(actor);
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

  return <div className="page-stack network-page"><header className="page-header network-page-header"><div><p className="eyebrow">Authorized geographic intelligence</p><h1>Network console</h1><p>Temporal locations, relationship context, and evidence-backed investigative pivots in one synchronized view.</p></div></header><NetworkExplorer initialProjection={serializeGeographicProjection(projection)} initialLayoutItems={layout.items} /></div>;
}
