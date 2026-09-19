import { redirect } from "next/navigation";
import { InvestigationWorkspace } from "@/features/investigations/investigation-workspace";
import { getCurrentActor } from "@/server/auth/session";
import { listCases } from "@/server/services/case-service";
import { listIncidents } from "@/server/services/incident-service";
import { listCasePeople } from "@/server/services/person-service";
import { getWorkspaceLayout } from "@/server/services/workspace-layout-service";
import { getFindingDepartments } from "@/server/services/investigation-service";
import { can } from "@/server/authorization/policy";

export default async function InvestigationsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  const [incidents, cases, layout, departments] = await Promise.all([listIncidents(actor), listCases(actor), getWorkspaceLayout(actor, "investigation"), getFindingDepartments(actor)]);
  const peopleByCase = await Promise.all(cases.map((record) => listCasePeople(actor, record.id)));
  const people = [...new Map(peopleByCase.flat().map((person) => [person.id, { id: person.id, displayName: person.displayName }])).values()];
  return <div className="page-stack"><header className="page-header"><div><p className="eyebrow">Bounded temporal analysis</p><h1>Investigation</h1><p>Authorized incident windows, transparent change detection, and evidence-grounded review leads.</p></div></header><InvestigationWorkspace people={people} incidents={incidents} cases={cases.map(({ id, firNumber }) => ({ id, firNumber }))} departments={departments} canAttachEvidence={can(actor, "EVIDENCE_ATTACH")} initialItems={layout.items} /></div>;
}
