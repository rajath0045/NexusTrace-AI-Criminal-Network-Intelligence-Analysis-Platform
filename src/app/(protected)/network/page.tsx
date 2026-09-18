import { redirect } from "next/navigation";
import { NetworkExplorer } from "@/features/graph/network-explorer";
import { serializeGraphNeighborhood } from "@/features/graph/graph-view-model";
import { getCurrentActor } from "@/server/auth/session";
import { getDefaultGraphFocus, getNeighborhood } from "@/server/services/graph-service";
import { getWorkspaceLayout } from "@/server/services/workspace-layout-service";

export default async function NetworkPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");

  const focus = await getDefaultGraphFocus(actor);
  const [graph, layout] = await Promise.all([
    getNeighborhood(actor, focus.id),
    getWorkspaceLayout(actor, "graph"),
  ]);

  return <div className="page-stack network-page"><header className="page-header"><div><p className="eyebrow">Authorized investigation graph</p><h1>Criminal network</h1><p>Bounded relationships, verification context, and evidence-backed investigative pivots.</p></div></header><NetworkExplorer initialGraph={serializeGraphNeighborhood(graph)} initialLayoutItems={layout.items} /></div>;
}
