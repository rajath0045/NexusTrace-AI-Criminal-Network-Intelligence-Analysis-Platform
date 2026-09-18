import { redirect } from "next/navigation";
import { IncidentForm } from "@/features/incidents/incident-form";
import { IncidentRegister } from "@/features/incidents/incident-panels";
import { WorkspaceGrid } from "@/features/workspace/workspace-grid";
import { getCurrentActor } from "@/server/auth/session";
import { can } from "@/server/authorization/policy";
import { listCases } from "@/server/services/case-service";
import { listCaseEvidence } from "@/server/services/evidence-service";
import { listIncidents } from "@/server/services/incident-service";
import { listCasePeople } from "@/server/services/person-service";
import { getWorkspaceLayout } from "@/server/services/workspace-layout-service";
import { createIncidentAction, submitIncidentAction } from "./actions";

export default async function IncidentsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  const [incidents, cases, layout] = await Promise.all([listIncidents(actor), listCases(actor), getWorkspaceLayout(actor, "incidents")]);
  const [peopleByCase, evidenceByCase] = await Promise.all([
    Promise.all(cases.map((record) => listCasePeople(actor, record.id))),
    Promise.all(cases.map((record) => listCaseEvidence(actor, record.id))),
  ]);
  const people = [...new Map(peopleByCase.flat().map((person) => [person.id, { id: person.id, displayName: person.displayName, aliases: person.aliases }])).values()];
  const evidence = evidenceByCase.flat();
  const widgets = [
    { id: "incident-register", content: <IncidentRegister incidents={incidents} /> },
    ...(can(actor, "INCIDENT_REVIEW") ? [{ id: "review-queue", content: <IncidentRegister incidents={incidents.filter((incident) => incident.submissionStatus === "PENDING_REVIEW")} /> }] : []),
    ...(can(actor, "INCIDENT_SUBMIT") ? [{ id: "submit-incident", content: <section className="workspace-widget-panel"><header><p className="eyebrow">Investigator contribution</p><h2>Submit incident observation</h2></header><IncidentForm action={submitIncidentAction} cases={cases} people={people} evidence={evidence} submitLabel="Submit for department review" /></section> }] : []),
    ...(can(actor, "INCIDENT_CREATE") ? [{ id: "create-incident", content: <section className="workspace-widget-panel"><header><p className="eyebrow">Department intelligence</p><h2>Create incident</h2></header><IncidentForm action={createIncidentAction} cases={cases} people={people} evidence={evidence} submitLabel="Create incident" /></section> }] : []),
  ];
  return <div className="page-stack"><header className="page-header"><div><p className="eyebrow">Temporal investigation</p><h1>Incidents</h1><p>Authorized incident intelligence, submitted observations, and department review.</p></div></header><WorkspaceGrid workspaceKey="incidents" initialItems={layout.items} widgets={widgets} ariaLabel="Incident workspace widgets" maxColumns={2} cellSize={360} /></div>;
}
