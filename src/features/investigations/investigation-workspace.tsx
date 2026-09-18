"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { TimelineList } from "@/features/incidents/timeline-list";
import { WorkspaceGrid } from "@/features/workspace/workspace-grid";
import type { IncidentSummary, TimelineItem } from "@/domain/incident";
import type { WorkspaceLayoutItem } from "@/domain/workspace";

interface PersonOption { id: string; displayName: string; }
interface EvidenceRef { id: string; verificationLevel: string; }
interface Finding { id: string; persistentId?: string; category: string; title: string; detail: string; status: string; reviewStatus: string; supportingRecordIds: string[]; evidence: EvidenceRef[]; verificationLevels: string[]; }
interface Metric { label: string; value: string; detail: string; }
interface Analysis { person: { id: string; displayName: string }; incident: { id: string; incidentNumber: string; title: string; occurredAt: string }; window: { startTime: string; endTime: string; baselineStartTime: string; baselineEndTime: string; beforeDays: number; afterDays: number }; timeline: Array<Omit<TimelineItem, "timestamp"> & { timestamp: string }>; findings: Finding[]; communicationMetrics: Metric[]; financialMetrics: Metric[]; networkMetrics: Metric[]; crossCaseMetrics: Metric[]; }

function Metrics({ title, metrics }: { title: string; metrics: Metric[] }) {
  return <section className="workspace-widget-panel investigation-panel"><header><p className="panel-kicker">Deterministic comparison</p><h2>{title}</h2></header><dl className="investigation-metrics">{metrics.map((metric) => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd><p>{metric.detail}</p></div>)}</dl></section>;
}

export function InvestigationWorkspace({ people, incidents, initialItems }: { people: PersonOption[]; incidents: IncidentSummary[]; initialItems: WorkspaceLayoutItem[] }) {
  const [personId, setPersonId] = useState(people[0]?.id ?? "");
  const [incidentId, setIncidentId] = useState(incidents[0]?.id ?? "");
  const [beforeDays, setBeforeDays] = useState("7");
  const [afterDays, setAfterDays] = useState("2");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ answer: string; evidence: EvidenceRef[]; notice: string } | null>(null);

  const timeline = useMemo(() => analysis?.timeline.map((item) => ({ ...item, timestamp: new Date(item.timestamp) })) ?? [], [analysis]);
  const runAnalysis = async () => {
    if (!personId || !incidentId) return;
    setLoading(true); setError(null); setAnswer(null);
    try {
      const response = await fetch(`/api/investigations/analyze?${new URLSearchParams({ personId, incidentId, beforeDays, afterDays })}`, { credentials: "same-origin" });
      const payload = await response.json() as Analysis & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load investigation analysis.");
      setAnalysis(payload);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load investigation analysis."); }
    finally { setLoading(false); }
  };
  const askCopilot = async () => {
    if (!question.trim() || !personId || !incidentId) return;
    setError(null);
    try {
      const response = await fetch("/api/investigations/copilot", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ personId, incidentId, beforeDays, afterDays, question }) });
      const payload = await response.json() as { answer?: string; evidence?: EvidenceRef[]; notice?: string; error?: string };
      if (!response.ok || !payload.answer || !payload.notice) throw new Error(payload.error ?? "Unable to answer this question.");
      setAnswer({ answer: payload.answer, evidence: payload.evidence ?? [], notice: payload.notice });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to answer this question."); }
  };
  const reviewFinding = async (finding: Finding, status: string, reasonCode: string) => {
    if (!finding.persistentId) return;
    setError(null);
    try { const response = await fetch(`/api/investigations/findings/${finding.persistentId}/review`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, reasonCode }) }); const payload = await response.json() as { reviewStatus?: string; error?: string }; if (!response.ok || !payload.reviewStatus) throw new Error(payload.error ?? "Unable to record review."); setAnalysis((current) => current ? { ...current, findings: current.findings.map((item) => item.persistentId === finding.persistentId ? { ...item, reviewStatus: payload.reviewStatus! } : item) } : current); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to record review."); }
  };
  const context = <section className="workspace-widget-panel investigation-panel"><header><p className="panel-kicker">Controlled analysis</p><h2>Incident window</h2><p>Runs only against authorized records and bounded dates. It creates review leads, not conclusions.</p></header><div className="investigation-controls"><label>Person<select aria-label="Person" value={personId} onChange={(event) => setPersonId(event.target.value)}>{people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></label><label>Incident<select aria-label="Incident" value={incidentId} onChange={(event) => setIncidentId(event.target.value)}>{incidents.map((incident) => <option key={incident.id} value={incident.id}>{incident.incidentNumber} · {incident.title}</option>)}</select></label><label>Days before<input aria-label="Days before" type="number" min="1" max="90" value={beforeDays} onChange={(event) => setBeforeDays(event.target.value)} /></label><label>Days after<input aria-label="Days after" type="number" min="0" max="30" value={afterDays} onChange={(event) => setAfterDays(event.target.value)} /></label><button type="button" onClick={runAnalysis} disabled={loading || !personId || !incidentId}>{loading ? "Analyzing…" : "Run analysis"}</button></div>{error ? <p className="form-error" role="alert">{error}</p> : null}{analysis ? <p className="investigation-window">{analysis.person.displayName} · {analysis.incident.incidentNumber} · {new Date(analysis.window.startTime).toLocaleDateString("en-IN")}–{new Date(analysis.window.endTime).toLocaleDateString("en-IN")}</p> : null}</section>;
  const findings = <section className="workspace-widget-panel investigation-panel"><header><p className="panel-kicker">Review queue</p><h2>Investigative leads</h2></header>{!analysis ? <EmptyState title="Select an incident window" description="Choose an authorized person and incident, then run a bounded deterministic comparison." /> : analysis.findings.length === 0 ? <EmptyState title="No deterministic leads" description="No configured change threshold was met in the selected authorized window." /> : <ul className="investigation-findings">{analysis.findings.map((finding) => <li key={finding.id}><StatusBadge tone="warning">{finding.category}</StatusBadge><strong>{finding.title}</strong><p>{finding.detail}</p><em>{finding.status}</em><StatusBadge>{finding.reviewStatus.replaceAll("_", " ")}</StatusBadge><div>{finding.evidence.map((source) => <Link key={source.id} href={`/api/evidence/${source.id}`}>Evidence · {source.verificationLevel}</Link>)}</div><div className="finding-actions"><button type="button" onClick={() => reviewFinding(finding, "ACKNOWLEDGED", "RELEVANT_TO_CASE")}>Acknowledge</button><button type="button" onClick={() => reviewFinding(finding, "NEEDS_MORE_EVIDENCE", "INSUFFICIENT_HISTORY")}>More evidence</button><button type="button" onClick={() => reviewFinding(finding, "DISMISSED", "FALSE_POSITIVE")}>Dismiss</button><button type="button" onClick={() => reviewFinding(finding, "ESCALATED", "REQUIRES_SUPERVISOR_REVIEW")}>Escalate</button></div></li>)}</ul>}</section>;
  const copilot = <section className="workspace-widget-panel investigation-panel"><header><p className="panel-kicker">Controlled assistant</p><h2>Investigation copilot</h2><p>Answers are generated from the same deterministic, authorized analysis—not unrestricted data access.</p></header><label className="copilot-question">Question<input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What changed in communications?" /></label><button type="button" onClick={askCopilot} disabled={!analysis || !question.trim()}>Ask controlled copilot</button>{answer ? <div className="copilot-answer"><StatusBadge tone="warning">{answer.notice}</StatusBadge><p>{answer.answer}</p>{answer.evidence.map((source) => <Link key={source.id} href={`/api/evidence/${source.id}`}>Open protected evidence · {source.verificationLevel}</Link>)}</div> : null}</section>;
  const widgets = [
    { id: "investigation-context", content: context },
    { id: "investigation-findings", content: findings },
    { id: "investigation-timeline", content: <TimelineList items={timeline} title="Unified investigation timeline" /> },
    { id: "communication-changes", content: <Metrics title="Communication changes" metrics={analysis?.communicationMetrics ?? []} /> },
    { id: "financial-changes", content: <Metrics title="Financial changes" metrics={analysis?.financialMetrics ?? []} /> },
    { id: "network-changes", content: <Metrics title="Network changes" metrics={analysis?.networkMetrics ?? []} /> },
    { id: "cross-case-links", content: <Metrics title="Cross-case context" metrics={analysis?.crossCaseMetrics ?? []} /> },
    { id: "investigation-copilot", content: copilot },
  ];
  return <WorkspaceGrid workspaceKey="investigation" initialItems={initialItems} widgets={widgets} ariaLabel="Investigation workspace panels" maxColumns={2} cellSize={360} />;
}
