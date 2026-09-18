import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { IncidentAuditPanel, IncidentEvidencePanel, IncidentPeoplePanel, IncidentSummaryPanel } from "@/features/incidents/incident-panels";
import { TimelineList } from "@/features/incidents/timeline-list";
import { WorkspaceGrid } from "@/features/workspace/workspace-grid";
import { getCurrentActor } from "@/server/auth/session";
import { can } from "@/server/authorization/policy";
import { getIncident, getTimeline } from "@/server/services/incident-service";
import { getWorkspaceLayout } from "@/server/services/workspace-layout-service";
import { reviewIncidentAction, verifyIncidentAction } from "../actions";

function ReviewPanel({ incidentId, canCrossVerify, canReview }: { incidentId: string; canCrossVerify: boolean; canReview: boolean }) {
  if (!canReview) return null;
  return <section className="workspace-widget-panel"><header><p className="eyebrow">Authorized review</p><h2>Review and provenance</h2></header><form action={reviewIncidentAction} className="record-form compact-form"><input type="hidden" name="incidentId" value={incidentId} /><div className="field-group"><label htmlFor="reviewReason">Decision reason</label><textarea id="reviewReason" name="reason" rows={3} required /></div><div className="form-actions"><button name="decision" value="ACCEPTED" type="submit">Accept submission</button><button name="decision" value="CHANGES_REQUESTED" type="submit">Request changes</button><button name="decision" value="REJECTED" type="submit">Reject</button></div></form><form action={verifyIncidentAction} className="record-form compact-form"><input type="hidden" name="incidentId" value={incidentId} /><input type="hidden" name="level" value={canCrossVerify ? "CROSS_VERIFIED" : "DEPARTMENT_VERIFIED"} /><div className="field-group"><label htmlFor="verificationReason">Verification reason</label><textarea id="verificationReason" name="reason" rows={3} required /></div><div className="form-actions"><button className="primary-button" type="submit">{canCrossVerify ? "Cross-verify" : "Department verify"}</button></div></form></section>;
}

export default async function IncidentDetailPage({ params }: { params: Promise<{ incidentId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  const incidentId = (await params).incidentId;
  const loaded = await Promise.all([getIncident(actor, incidentId), getTimeline(actor, { incidentId, types: ["ALL"] }), getWorkspaceLayout(actor, "incident-detail")]).catch((error: unknown) => {
    if (error && typeof error === "object" && "code" in error && error.code === "NOT_FOUND") notFound();
    throw error;
  });
  const [incident, timeline, layout] = loaded;
  const canReview = can(actor, "INCIDENT_REVIEW");
  const widgets = [
    { id: "incident-summary", content: <IncidentSummaryPanel incident={incident} /> },
    { id: "incident-people", content: <IncidentPeoplePanel incident={incident} /> },
    { id: "incident-evidence", content: <IncidentEvidencePanel incident={incident} /> },
    { id: "incident-timeline", content: <TimelineList items={timeline} title="Incident timeline" /> },
    { id: "incident-audit", content: <IncidentAuditPanel incident={incident} /> },
    ...(canReview ? [{ id: "incident-review", content: <ReviewPanel incidentId={incident.id} canReview={canReview} canCrossVerify={can(actor, "INCIDENT_CROSS_VERIFY")} /> }] : []),
  ];
  return <div className="page-stack"><Link className="back-link" href="/incidents">← Back to incidents</Link><header className="page-header"><div><p className="eyebrow">{incident.incidentNumber}</p><h1>{incident.title}</h1><p>{incident.departmentName} · {incident.submissionStatus} · {incident.verificationLevel}</p></div></header><WorkspaceGrid workspaceKey="incident-detail" initialItems={layout.items} widgets={widgets} ariaLabel="Incident detail workspace widgets" maxColumns={2} cellSize={360} /></div>;
}
