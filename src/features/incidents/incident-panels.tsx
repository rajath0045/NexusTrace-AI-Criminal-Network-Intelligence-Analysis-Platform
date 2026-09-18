import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type { IncidentDetail, IncidentSummary } from "@/domain/incident";

export function IncidentRegister({ incidents }: { incidents: IncidentSummary[] }) {
  return <section className="workspace-widget-panel workspace-widget-panel--table"><header className="workspace-widget-heading-row"><div><p className="eyebrow">Authorized intelligence</p><h2>Incident register</h2></div><span className="workspace-record-count">{String(incidents.length).padStart(2, "0")}</span></header>{incidents.length === 0 ? <EmptyState title="No authorized incidents" description="Incident observations and verified records in your access scope appear here." /> : <ul className="workspace-record-list">{incidents.map((incident) => <li key={incident.id}><Link href={`/incidents/${incident.id}`}><span><strong>{incident.incidentNumber} · {incident.title}</strong><small>{incident.incidentType.replaceAll("_", " ")} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" }).format(incident.occurredAt)}</small></span><StatusBadge>{incident.verificationLevel}</StatusBadge></Link></li>)}</ul>}</section>;
}

export function IncidentSummaryPanel({ incident }: { incident: IncidentDetail }) {
  return <section className="workspace-widget-panel"><header><p className="eyebrow">{incident.incidentNumber} · {incident.incidentType.replaceAll("_", " ")}</p><h2>Incident summary</h2></header><p className="record-description">{incident.description}</p><dl className="workspace-facts"><div><dt>Occurred</dt><dd>{new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }).format(incident.occurredAt)}</dd></div><div><dt>Location</dt><dd>{incident.location ?? "Not recorded"}</dd></div><div><dt>Related FIR</dt><dd>{incident.caseId ? <Link href={`/cases/${incident.caseId}`}>{incident.caseFirNumber}</Link> : "Not linked"}</dd></div><div><dt>State</dt><dd><StatusBadge>{incident.submissionStatus}</StatusBadge></dd></div><div><dt>Verification</dt><dd><StatusBadge>{incident.verificationLevel}</StatusBadge></dd></div></dl></section>;
}

export function IncidentPeoplePanel({ incident }: { incident: IncidentDetail }) {
  return <section className="workspace-widget-panel"><header><p className="eyebrow">Canonical records</p><h2>People involved</h2></header>{incident.people.length === 0 ? <EmptyState title="No people linked" description="Authorized participant links will appear here." /> : <ul className="person-list">{incident.people.map((person) => <li key={person.id}><div>{person.personId ? <Link href={`/people/${person.personId}`}>{person.displayName}</Link> : <strong>{person.displayName}</strong>}<p>{person.notes ?? "No participation notes recorded."}</p></div><StatusBadge>{person.participation}</StatusBadge></li>)}</ul>}</section>;
}

export function IncidentEvidencePanel({ incident }: { incident: IncidentDetail }) {
  return <section className="workspace-widget-panel"><header><p className="eyebrow">Protected provenance</p><h2>Supporting evidence</h2></header>{incident.evidence.length === 0 ? <EmptyState title="No evidence linked" description="Supporting evidence is attached through the existing authenticated evidence workflow." /> : <ul className="evidence-summary-list">{incident.evidence.map((evidence) => <li key={evidence.id}><div><a href={`/api/evidence/${evidence.evidenceId}`}><strong>{evidence.originalFilename}</strong></a><span>{evidence.note ?? "Incident source evidence"}</span></div><StatusBadge>{evidence.verificationState}</StatusBadge></li>)}</ul>}</section>;
}

export function IncidentAuditPanel({ incident }: { incident: IncidentDetail }) {
  return <section className="workspace-widget-panel"><header><p className="eyebrow">Immutable activity</p><h2>Audit activity</h2></header>{incident.audit.length === 0 ? <EmptyState title="No audit activity" description="Authorized incident actions will be recorded here." /> : <ol className="workspace-record-list">{incident.audit.map((event) => <li key={event.id}><span><strong>{event.action.replaceAll("_", " ")}</strong><small>{event.actorName ?? "System"} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(event.createdAt)}</small></span><StatusBadge>{event.outcome}</StatusBadge></li>)}</ol>}</section>;
}
