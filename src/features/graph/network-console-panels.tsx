"use client";

import Link from "next/link";
import { ArrowRight, Clock3, Crosshair, FileSearch, MapPin, ShieldCheck } from "lucide-react";
import type { GraphEntityType } from "@/domain/model";
import type { SerializedGeographicConnection, SerializedGeographicProjection } from "./geographic-view-model";

export function titleCase(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatMoment(value: string | null): string {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC";
}

export function EventTimeline({ projection, onWindowSelect }: { projection: SerializedGeographicProjection; onWindowSelect: (start: string, end: string) => void }) {
  const items = projection.timeline.slice(0, 10);
  const chooseWindow = (timestamp: string) => {
    const center = new Date(timestamp).getTime();
    onWindowSelect(new Date(center - 12 * 60 * 60 * 1_000).toISOString(), new Date(center + 12 * 60 * 60 * 1_000).toISOString());
  };
  return <section className="network-timeline" aria-label="Event timeline"><header><span className="eyebrow">Event timeline</span><strong>{items.length} recent authorized events</strong></header><div className="network-timeline-track">{items.length === 0 ? <p>No timeline events in this window.</p> : items.map((item) => <button key={item.id} type="button" onClick={() => chooseWindow(item.timestamp)} title={item.description}><i /><span>{titleCase(item.type)}</span><strong>{item.title}</strong><time>{formatMoment(item.timestamp)}</time></button>)}</div></section>;
}

export function InvestigationContext({ projection }: { projection: SerializedGeographicProjection }) {
  return <section className="network-rail-panel"><header><Crosshair aria-hidden="true" /><div><span className="eyebrow">Investigation context</span><h2>{projection.focusEntity.displayLabel}</h2></div></header><dl className="network-compact-facts"><div><dt>Entity</dt><dd>{titleCase(projection.focusEntity.entityType)}</dd></div><div><dt>Visible network</dt><dd>{projection.graph.nodes.length} entities / {projection.graph.edges.length} links</dd></div><div><dt>Observations</dt><dd>{projection.observations.length} authorized</dd></div><div><dt>Time window</dt><dd>Bounded projection</dd></div></dl></section>;
}

export function ActivityQueue({ projection, onConnectionSelect }: { projection: SerializedGeographicProjection; onConnectionSelect: (id: string) => void }) {
  const items = projection.connections.filter((item) => item.records.length > 0).slice(0, 6);
  return <section className="network-rail-panel"><header><Clock3 aria-hidden="true" /><div><span className="eyebrow">Activity queue</span><h2>Recent connections</h2></div></header>{items.length === 0 ? <p className="workspace-widget-muted">No connection activity matches this scope.</p> : <ol className="network-activity-list">{items.map((item) => <li key={item.id}><button type="button" onClick={() => onConnectionSelect(item.id)}><span>{item.sourceLabel} <ArrowRight aria-hidden="true" size={11} /> {item.targetLabel}</span><small>{item.records.length} source record{item.records.length === 1 ? "" : "s"}</small></button></li>)}</ol>}</section>;
}

export function SelectedEntityPanel({ projection, entityId, onFocus }: { projection: SerializedGeographicProjection; entityId: string | null; onFocus: (id: string) => void }) {
  const entity = projection.graph.nodes.find((item) => item.id === entityId) ?? projection.focusEntity;
  const observations = projection.observations.filter((item) => item.graphEntityId === entity.id);
  const canonicalHref = entity.canonicalRecord?.type === "PERSON" ? `/people/${entity.canonicalRecord.id}` : entity.canonicalRecord?.type === "CASE" ? `/cases/${entity.canonicalRecord.id}` : entity.canonicalRecord?.type === "INCIDENT" ? `/incidents/${entity.canonicalRecord.id}` : null;
  return <section className="network-rail-panel"><header><MapPin aria-hidden="true" /><div><span className="eyebrow">Selected entity</span><h2>{entity.displayLabel}</h2></div></header><dl className="network-compact-facts"><div><dt>Type</dt><dd>{titleCase(entity.entityType)}</dd></div><div><dt>Verification</dt><dd>{titleCase(entity.verificationState)}</dd></div><div><dt>Geographic records</dt><dd>{observations.length}</dd></div>{observations[0] ? <div><dt>Latest authorized place</dt><dd>{observations[0].locationLabel}</dd></div> : null}</dl><div className="network-panel-actions">{canonicalHref ? <Link href={canonicalHref}>Open profile</Link> : null}{entity.id !== projection.focusEntity.id ? <button type="button" onClick={() => onFocus(entity.id)}>Make shared focus</button> : null}</div></section>;
}

function LocationResolution({ label, status, location, distance }: { label: string; status: "KNOWN" | "UNKNOWN"; location: string | null; distance: number | null }) {
  return <div className={status === "KNOWN" ? "is-known" : "is-unknown"}><dt>{label}</dt><dd>{status === "KNOWN" ? location : "LOCATION UNKNOWN"}{distance !== null ? <small>{distance}s from event time</small> : null}</dd></div>;
}

export function ConnectionDetailsPanel({ connection }: { connection: SerializedGeographicConnection | null }) {
  if (!connection) return <section className="network-rail-panel"><header><FileSearch aria-hidden="true" /><div><span className="eyebrow">Connection details</span><h2>Select a connection</h2></div></header><p className="workspace-widget-muted">Select a map line, activity badge, timeline record, or relationship edge to inspect why NexusTrace shows it.</p></section>;
  return <section className="network-rail-panel network-connection-detail"><header><FileSearch aria-hidden="true" /><div><span className="eyebrow">Why this connection exists</span><h2>{connection.sourceLabel} ↔ {connection.targetLabel}</h2></div></header><dl className="network-compact-facts"><div><dt>Relationship tier</dt><dd>{connection.strength ? titleCase(connection.strength) : "Activity-derived"}</dd></div><div><dt>Verification</dt><dd>{titleCase(connection.verification)}</dd></div><div><dt>Bundled activity</dt><dd>{connection.counts.calls} calls · {connection.counts.messages} messages · {connection.counts.financial} transactions</dd></div></dl><ol className="network-record-list">{connection.records.map((record) => <li key={record.id}><div><strong>{titleCase(record.label)}</strong><time>{formatMoment(record.occurredAt)}</time></div>{record.durationSeconds !== null ? <p>Duration {Math.floor(record.durationSeconds / 60)}m {record.durationSeconds % 60}s</p> : null}{record.amount !== null ? <p>{record.currency ?? ""} {record.amount.toLocaleString("en-IN")}</p> : null}{record.sourceLocation && record.destinationLocation ? <dl className="network-location-pair"><LocationResolution label={connection.sourceLabel} status={record.sourceLocation.status} location={record.sourceLocation.observation?.locationLabel ?? null} distance={record.sourceLocation.temporalDistanceSeconds} /><LocationResolution label={connection.targetLabel} status={record.destinationLocation.status} location={record.destinationLocation.observation?.locationLabel ?? null} distance={record.destinationLocation.temporalDistanceSeconds} /></dl> : null}<footer><span>{record.id}</span>{record.caseFirNumber ? <Link href={`/cases/${record.caseId}`}>{record.caseFirNumber}</Link> : null}{record.sourceEvidenceId ? <Link href={`/api/evidence/${record.sourceEvidenceId}`} target="_blank">Source evidence</Link> : null}</footer></li>)}</ol></section>;
}

export function AnalystContext({ projection }: { projection: SerializedGeographicProjection }) {
  return <section className="network-rail-panel"><header><ShieldCheck aria-hidden="true" /><div><span className="eyebrow">Analyst context</span><h2>Review leads</h2></div></header>{projection.findings.length === 0 ? <p className="workspace-widget-muted">No generated findings in this authorized scope.</p> : <ul className="network-findings-list">{projection.findings.slice(0, 4).map((finding) => <li key={finding.id}><strong>{finding.title}</strong><span>{titleCase(finding.category)} · {titleCase(finding.reviewStatus)}</span></li>)}</ul>}</section>;
}

export function InvestigationActions({ focusType }: { focusType: GraphEntityType }) {
  return <section className="network-rail-panel"><header><Crosshair aria-hidden="true" /><div><span className="eyebrow">Investigation actions</span><h2>Continue analysis</h2></div></header><div className="network-action-list"><Link href="/investigation">Open investigation workspace</Link><Link href="/incidents">Review incidents</Link><Link href="/cases">Review cases</Link></div><p className="workspace-widget-muted">Actions retain server-side authorization. Current focus type: {titleCase(focusType)}.</p></section>;
}

export function SignalPanel({ eyebrow, title, facts }: { eyebrow: string; title: string; facts: Array<[string, string | number]> }) {
  return <article className="workspace-widget-panel network-signal-panel"><header><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></header><dl className="workspace-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></article>;
}

export function RelatedCasesPanel({ projection }: { projection: SerializedGeographicProjection }) {
  const cases = new Map<string, string>();
  for (const activity of projection.activities) if (activity.caseId && activity.caseFirNumber) cases.set(activity.caseId, activity.caseFirNumber);
  return <article className="workspace-widget-panel network-signal-panel"><header><p className="eyebrow">Related cases</p><h2>Authorized case context</h2></header>{cases.size === 0 ? <p className="workspace-widget-muted">No case-linked activity in this window.</p> : <ul className="network-related-cases">{[...cases].map(([id, fir]) => <li key={id}><Link href={`/cases/${id}`}>{fir}</Link></li>)}</ul>}</article>;
}
