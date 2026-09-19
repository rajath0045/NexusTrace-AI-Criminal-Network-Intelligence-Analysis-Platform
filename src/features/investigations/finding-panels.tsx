"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CopilotAnswer, PersistedFindingView } from "@/domain/investigation";

type Serialized<T> = T extends Date ? string : T extends Array<infer U> ? Array<Serialized<U>> : T extends object ? { [K in keyof T]: Serialized<T[K]> } : T;
export type Finding = Serialized<PersistedFindingView>;
export type Answer = Serialized<CopilotAnswer>;
export const leadNotice = "INVESTIGATIVE LEAD — HUMAN REVIEW REQUIRED";
export const readable = (value: string) => value.replaceAll("_", " ");
export function timestamp(value: string) { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC"; }

export function FindingDetail({ finding, sourceType }: { finding: Finding; sourceType: string }) {
  const latest = finding.reviews[0];
  const snapshot = finding.snapshot;
  const sources = (finding.supportingRecords ?? []).filter((record) => sourceType === "ALL" || sourceType === record.type);
  return <>
    <StatusBadge tone="warning">{leadNotice}</StatusBadge>
    <p>{finding.detail}</p>
    <dl className="finding-facts">
      <div><dt>Type</dt><dd>{readable(finding.category)}</dd></div>
      <div><dt>Person / Incident / Case</dt><dd>{finding.personName} · {finding.incidentNumber} · {finding.caseFirNumber ?? "No FIR link"}</dd></div>
      <div><dt>Analysis window</dt><dd>{timestamp(finding.windowStart)} → {timestamp(finding.windowEnd)}</dd></div>
      <div><dt>First generated</dt><dd>{timestamp(finding.generatedAt)}</dd></div>
      <div><dt>Current review state</dt><dd>{readable(finding.reviewStatus)}{finding.reviewStatus === "ESCALATED" ? " · Awaiting supervisory coordination" : ""}</dd></div>
      <div><dt>Disposition reason</dt><dd>{latest ? readable(latest.reasonCode) : "No human disposition"}</dd></div>
      <div><dt>Reviewer note</dt><dd>{latest?.note ?? "No note recorded"}</dd></div>
    </dl>
    <h3>Observed metrics and historical baseline</h3>
    {snapshot ? <>
      <p className="workspace-widget-muted">Captured {timestamp(snapshot.capturedAt)}. Baseline: {timestamp(snapshot.baselineStartTime)} → {timestamp(snapshot.baselineEndTime)}.</p>
      <dl className="finding-facts">{snapshot.metrics.map((metric) => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd><p>{metric.detail}</p></div>)}</dl>
      <p>{snapshot.comparison ? `Observed ${snapshot.comparison.observed} ${snapshot.comparison.unit}; baseline ${snapshot.comparison.baseline}; delta ${snapshot.comparison.delta.toFixed(2)} (${snapshot.comparison.percentageChange === null ? "no percentage baseline" : `${snapshot.comparison.percentageChange.toFixed(1)}%`}).` : "No numeric delta applies to this descriptive finding."}</p>
    </> : <p className="workspace-widget-muted">A metric snapshot is unavailable for this earlier finding or its sources are no longer authorized. Run an authorized analysis to capture current context.</p>}
    <h3>Supporting sources · {sourceType === "ALL" ? "All types" : readable(sourceType)}</h3>
    {sources.length ? <ul className="investigation-findings">{sources.map((source) => <li key={source.id}>
      <strong>{source.label} · {readable(source.type)}</strong><p>{source.description}</p>
      <p>{source.observedAt ? timestamp(source.observedAt) : "Observation time unavailable"} · <StatusBadge>{readable(source.verificationState)}</StatusBadge></p>
      <div className="follow-links">{source.sourceEvidenceIds.map((id) => <a key={id} href={`/api/evidence/${id}`}>Inspect source evidence</a>)}</div>
    </li>)}</ul> : <p>No authorized sources match this type.</p>}
    <h3>Supporting evidence / provenance</h3>
    <p className="workspace-widget-muted">Verification below describes the source, not the investigative lead.</p>
    <div className="follow-links">{finding.evidence.map((source) => <a key={source.id} href={`/api/evidence/${source.id}`}>{source.filename ?? "Inspect evidence"} · {readable(source.sourceVerificationState ?? source.verificationLevel)}</a>)}</div>
    {!finding.evidence.length ? <p>No authorized evidence is linked.</p> : null}
  </>;
}

export function FindingHistory({ finding }: { finding: Finding }) {
  if (!finding.reviews.length) return <p>No human review has been recorded.</p>;
  return <ol className="finding-history">{[...finding.reviews].reverse().map((review) => <li key={review.id}>
    <time dateTime={review.createdAt}>{timestamp(review.createdAt)}</time>
    <strong>{readable(review.previousStatus)} → {readable(review.status)}</strong>
    <span>{review.reviewerName} · {readable(review.reviewerRole)} · {review.reviewerDepartmentName}</span>
    <p>{readable(review.reasonCode)} · {review.note ?? "No note recorded"}</p>
  </li>)}</ol>;
}

export function SupportingEvidence({ finding, sourceType }: { finding: Finding; sourceType: string }) {
  const sources = (finding.supportingRecords ?? []).filter((record) => sourceType === "ALL" || sourceType === record.type);
  return <>
    <p className="workspace-widget-muted">Source verification describes the underlying record and does not verify the investigative lead.</p>
    {sources.length ? <ul className="investigation-findings">{sources.map((source) => <li key={source.id}><strong>{source.label} · {readable(source.type)}</strong><p>{source.description}</p><p>{source.observedAt ? timestamp(source.observedAt) : "Observation time unavailable"} · {readable(source.verificationState)}</p>{source.sourceEvidenceIds.map((id) => <a key={id} href={`/api/evidence/${id}`}>Inspect source evidence</a>)}</li>)}</ul> : <p>No authorized sources match this type.</p>}
    <div className="follow-links">{finding.evidence.map((source) => <a key={source.id} href={`/api/evidence/${source.id}`}>{source.filename ?? "Inspect evidence"} · {readable(source.sourceVerificationState ?? source.verificationLevel)}</a>)}</div>
  </>;
}

export function FindingLinks({ finding, canAttachEvidence, inspect }: { finding: Finding; canAttachEvidence: boolean; inspect: (type: string) => void }) {
  return <div className="follow-links">
    <Link href={`/people/${finding.personId}`}>Open Person</Link>
    <Link href={`/incidents/${finding.incidentId}`}>Open Incident</Link>
    {finding.caseId ? <Link href={`/cases/${finding.caseId}`}>Open Case/FIR</Link> : null}
    <button onClick={() => inspect("COMMUNICATION")}>Inspect Communications</button>
    <button onClick={() => inspect("FINANCIAL")}>Inspect Financial Transactions</button>
    <button onClick={() => inspect("RELATIONSHIP")}>Inspect Relationships</button>
    <button onClick={() => inspect("ALL")}>Inspect all sources / evidence</button>
    <Link href="/network">Open Network Graph</Link><Link href="/incidents">Submit observation / contribution</Link>
    {canAttachEvidence && finding.caseId ? <Link href={`/cases/${finding.caseId}`}>Link additional case evidence</Link> : null}
  </div>;
}
