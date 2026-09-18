"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { RelationshipStrength, VerificationState } from "@/domain/model";
import type { WorkspaceLayoutItem } from "@/domain/workspace";
import { WorkspaceGrid } from "@/features/workspace/workspace-grid";
import type { SerializedGraphNeighborhood, SerializedRelationshipDetail } from "./graph-view-model";
import { NetworkCanvas } from "./network-canvas";

interface NetworkExplorerProps {
  initialGraph: SerializedGraphNeighborhood;
  initialLayoutItems: WorkspaceLayoutItem[];
}

const relationshipTiers = [
  [RelationshipStrength.Primary, "Primary relationships"],
  [RelationshipStrength.Secondary, "Secondary relationships"],
  [RelationshipStrength.Tertiary, "Tertiary relationships"],
] as const;

const verificationFilters = [
  [VerificationState.Verified, "Verified relationships"],
  [VerificationState.Pending, "Pending review relationships"],
  [VerificationState.ChangesRequested, "Changes requested relationships"],
  [VerificationState.Rejected, "Rejected relationships"],
] as const;

function titleCase(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function graphUrl(focus: string, hops: number, strengths: RelationshipStrength[], verificationStates: VerificationState[]): string {
  const parameters = new URLSearchParams({ focus, hops: String(hops), strengths: strengths.join(","), verificationStates: verificationStates.join(",") });
  return `/api/network?${parameters.toString()}`;
}

export function NetworkExplorer({ initialGraph, initialLayoutItems }: NetworkExplorerProps) {
  const [graph, setGraph] = useState(initialGraph);
  const [strengths, setStrengths] = useState<RelationshipStrength[]>(initialGraph.activeFilters.strengths);
  const [verificationStates, setVerificationStates] = useState<VerificationState[]>(initialGraph.activeFilters.verificationStates);
  const [hops, setHops] = useState(initialGraph.activeFilters.hops);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialGraph.focusEntity.id);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SerializedRelationshipDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [fitVersion, setFitVersion] = useState(0);
  const [recenterVersion, setRecenterVersion] = useState(0);

  const selectedNode = useMemo(
    () => graph.nodes.find((node) => node.id === selectedNodeId) ?? graph.focusEntity,
    [graph.focusEntity, graph.nodes, selectedNodeId],
  );

  const requestGraph = useCallback(async (
    nextFocus = graph.focusEntity.id,
    nextHops = hops,
    nextStrengths = strengths,
    nextVerificationStates = verificationStates,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(graphUrl(nextFocus, nextHops, nextStrengths, nextVerificationStates), { credentials: "same-origin" });
      if (!response.ok) throw new Error("Graph request failed");
      const nextGraph = await response.json() as SerializedGraphNeighborhood;
      setGraph(nextGraph);
      setSelectedNodeId(nextGraph.focusEntity.id);
      setSelectedEdgeId(null);
      setDetail(null);
      setFocusMode(false);
      setFitVersion((value) => value + 1);
    } catch {
      setError("The graph could not be loaded. Try again without changing your authorized access scope.");
    } finally {
      setLoading(false);
    }
  }, [graph.focusEntity.id, hops, strengths, verificationStates]);

  const toggleStrength = useCallback((tier: RelationshipStrength) => {
    const next = strengths.includes(tier) ? strengths.filter((value) => value !== tier) : [...strengths, tier];
    if (next.length === 0) return;
    setStrengths(next);
    void requestGraph(graph.focusEntity.id, hops, next, verificationStates);
  }, [graph.focusEntity.id, hops, requestGraph, strengths, verificationStates]);

  const toggleVerification = useCallback((state: VerificationState) => {
    const next = verificationStates.includes(state) ? verificationStates.filter((value) => value !== state) : [...verificationStates, state];
    if (next.length === 0) return;
    setVerificationStates(next);
    void requestGraph(graph.focusEntity.id, hops, strengths, next);
  }, [graph.focusEntity.id, hops, requestGraph, strengths, verificationStates]);

  const selectHops = useCallback((next: 1 | 2 | 3) => {
    setHops(next);
    void requestGraph(graph.focusEntity.id, next, strengths, verificationStates);
  }, [graph.focusEntity.id, requestGraph, strengths, verificationStates]);

  const onNodeSelect = useCallback((entityId: string) => {
    setSelectedNodeId(entityId);
    setSelectedEdgeId(null);
    setDetail(null);
    setDetailError(null);
    setFocusMode(entityId !== graph.focusEntity.id);
  }, [graph.focusEntity.id]);

  const onEdgeSelect = useCallback(async (relationshipId: string) => {
    setSelectedEdgeId(relationshipId);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/relationships/${encodeURIComponent(relationshipId)}`, { credentials: "same-origin" });
      if (!response.ok) throw new Error("Connection request failed");
      setDetail(await response.json() as SerializedRelationshipDetail);
    } catch {
      setDetailError("Connection details are unavailable for this authorized view.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const selectedContext = useMemo(() => {
    const connected = graph.edges.filter((edge) => edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id);
    const summaries = graph.provenanceSummaries.filter((summary) => connected.some((edge) => edge.id === summary.relationshipId));
    return {
      relationshipCount: connected.length,
      relatedCaseCount: new Set(summaries.flatMap((summary) => summary.sourceCaseIds)).size,
      evidenceCount: summaries.reduce((count, summary) => count + summary.sourceCount, 0),
    };
  }, [graph.edges, graph.provenanceSummaries, selectedNode.id]);

  const widgets = [
    { id: "entity-details", content: <EntityDetails entity={selectedNode} isFocus={selectedNode.id === graph.focusEntity.id} context={selectedContext} onExplore={() => void requestGraph(selectedNode.id)} /> },
    { id: "connection-details", content: <ConnectionDetails detail={detail} loading={detailLoading} error={detailError} /> },
    { id: "supporting-evidence", content: <SupportingEvidence detail={detail} /> },
  ];

  return (
    <div className="network-workspace">
      <section className="network-toolbar" aria-label="Network graph controls">
        <div className="network-toolbar-group">
          <span>Relationship tier</span>
          {relationshipTiers.map(([tier, label]) => <button key={tier} type="button" aria-label={label} aria-pressed={strengths.includes(tier)} onClick={() => toggleStrength(tier)}>{label.replace(" relationships", "")}</button>)}
        </div>
        <div className="network-toolbar-group">
          <span>Verification</span>
          {verificationFilters.map(([state, label]) => <button key={state} type="button" aria-label={label} aria-pressed={verificationStates.includes(state)} onClick={() => toggleVerification(state)}>{label.replace(" relationships", "")}</button>)}
        </div>
        <div className="network-toolbar-group">
          <span>Traversal</span>
          {[1, 2, 3].map((value) => <button key={value} type="button" aria-pressed={hops === value} onClick={() => selectHops(value as 1 | 2 | 3)}>{value} hop{value > 1 ? "s" : ""}</button>)}
        </div>
        <div className="network-toolbar-actions">
          <button type="button" onClick={() => setFitVersion((value) => value + 1)}>Fit graph</button>
          <button type="button" onClick={() => setRecenterVersion((value) => value + 1)}>Recenter</button>
          <button type="button" onClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); setDetail(null); setFocusMode(false); }}>Clear focus</button>
          <button type="button" aria-expanded={legendOpen} aria-label={legendOpen ? "Hide graph legend" : "Show graph legend"} onClick={() => setLegendOpen((open) => !open)}>Legend</button>
        </div>
      </section>

      {legendOpen ? <GraphLegend /> : null}

      {error ? <p className="network-alert" role="alert">{error}</p> : null}
      <section className="network-investigation-canvas" aria-busy={loading}>
        <div className="network-canvas-header">
          <div><span className="eyebrow">Focus entity</span><strong>{graph.focusEntity.displayLabel}</strong><span>{titleCase(graph.focusEntity.entityType)} · {hops} hop{hops > 1 ? "s" : ""}{focusMode ? " · neighborhood focus" : ""}</span></div>
          <p className="network-canvas-instruction">Hover markers for concise context. Select a marker to investigate its neighborhood.</p>
        </div>
        {loading ? <div className="network-loading">Refreshing authorized graph…</div> : null}
        {graph.edges.length === 0 ? <div className="network-empty"><strong>No authorized relationships match these filters.</strong><span>Enable another verified state, relationship tier, or hop depth to widen this bounded view.</span></div> : <NetworkCanvas focusEntityId={graph.focusEntity.id} nodes={graph.nodes} edges={graph.edges} selectedNodeId={selectedNodeId} selectedEdgeId={selectedEdgeId} focusMode={focusMode} fitVersion={fitVersion} recenterVersion={recenterVersion} onNodeSelect={onNodeSelect} onEdgeSelect={onEdgeSelect} />}
      </section>

      <div className="network-edge-list" aria-label="Keyboard accessible graph connections">
        {graph.edges.map((edge) => <button key={edge.id} type="button" aria-pressed={edge.id === selectedEdgeId} onClick={() => void onEdgeSelect(edge.id)}>{titleCase(edge.relationshipType)} · {titleCase(edge.strength)} · {edge.interactionCount} interactions</button>)}
      </div>
      <WorkspaceGrid workspaceKey="graph" initialItems={initialLayoutItems} widgets={widgets} ariaLabel="Graph investigation panels" maxColumns={3} cellSize={300} />
    </div>
  );
}

function EntityDetails({ entity, isFocus, context, onExplore }: { entity: SerializedGraphNeighborhood["nodes"][number]; isFocus: boolean; context: { relationshipCount: number; relatedCaseCount: number; evidenceCount: number }; onExplore: () => void }) {
  const canonicalHref = entity.canonicalRecord?.type === "PERSON" ? `/people/${entity.canonicalRecord.id}` : entity.canonicalRecord?.type === "CASE" ? `/cases/${entity.canonicalRecord.id}` : entity.canonicalRecord?.type === "INCIDENT" ? `/incidents/${entity.canonicalRecord.id}` : null;
  return <article className="workspace-widget-panel"><header><p className="eyebrow">{isFocus ? "Current focus" : "Selected entity"}</p><h2>{entity.displayLabel}</h2></header><dl className="workspace-facts"><div><dt>Entity type</dt><dd>{titleCase(entity.entityType)}</dd></div><div><dt>Verification</dt><dd>{titleCase(entity.verificationState)}</dd></div><div><dt>Visible relationships</dt><dd>{context.relationshipCount}</dd></div><div><dt>Related cases</dt><dd>{context.relatedCaseCount}</dd></div><div><dt>Supporting evidence</dt><dd>{context.evidenceCount}</dd></div></dl>{canonicalHref && entity.canonicalRecord ? <Link className="secondary-button" href={canonicalHref}>Open {entity.canonicalRecord.type.toLowerCase()} profile</Link> : null}{!isFocus ? <button type="button" className="primary-button" onClick={onExplore}>Explore from this entity</button> : <p className="workspace-widget-muted">This entity is the bounded traversal origin.</p>}</article>;
}

function ConnectionDetails({ detail, loading, error }: { detail: SerializedRelationshipDetail | null; loading: boolean; error: string | null }) {
  if (loading) return <article className="workspace-widget-panel"><p className="workspace-widget-muted">Loading authorized connection details…</p></article>;
  if (error) return <article className="workspace-widget-panel"><p role="alert" className="network-alert">{error}</p></article>;
  if (!detail) return <article className="workspace-widget-panel"><header><p className="eyebrow">Connection details</p><h2>Select a connection</h2></header><p className="workspace-widget-muted">Choose an edge to see its source, verification state, timing, and provenance.</p></article>;
  const relatedCases = [...new Set(detail.provenance.map((source) => source.sourceFirNumber))];
  const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : "Not recorded";
  return <article className="workspace-widget-panel"><header><p className="eyebrow">Connection details</p><h2>{titleCase(detail.relationshipType)}</h2></header><p className="network-why">Why this connection exists</p><dl className="workspace-facts"><div><dt>Path</dt><dd>{detail.sourceEntity.displayLabel} → {detail.targetEntity.displayLabel}</dd></div><div><dt>Strength</dt><dd>{titleCase(detail.strength)}</dd></div><div><dt>Evidence confidence</dt><dd>{titleCase(detail.evidenceConfidence)}</dd></div><div><dt>Verification</dt><dd>{titleCase(detail.verificationState)}</dd></div><div><dt>Interactions</dt><dd>{detail.interactionCount}</dd></div><div><dt>First observed</dt><dd>{formatDate(detail.firstObservedAt)}</dd></div><div><dt>Latest observed</dt><dd>{formatDate(detail.latestObservedAt)}</dd></div><div><dt>Related cases</dt><dd>{relatedCases.join(", ") || "No associated case"}</dd></div><div><dt>Created by</dt><dd>{detail.createdByName}</dd></div>{detail.verifiedByName ? <div><dt>Verified by</dt><dd>{detail.verifiedByName}</dd></div> : null}</dl></article>;
}

function GraphLegend() {
  return <aside className="network-legend-popover" aria-label="Graph legend"><div><p className="eyebrow">Node types</p><span><i className="legend-person" /> Person</span><span><i className="legend-case" /> Case</span><span><i className="legend-device" /> Device / phone</span><span><i className="legend-account" /> Account / organization</span></div><div><p className="eyebrow">Relationships</p><span><i className="legend-line" /> Primary</span><span><i className="legend-secondary" /> Secondary</span><span><i className="legend-tertiary" /> Tertiary</span><span><i className="legend-dotted" /> Pending or unverified</span></div></aside>;
}

function SupportingEvidence({ detail }: { detail: SerializedRelationshipDetail | null }) {
  return <article className="workspace-widget-panel"><header><p className="eyebrow">Evidence and context</p><h2>Supporting records</h2></header>{!detail ? <p className="workspace-widget-muted">Select a connection to inspect its authorized supporting evidence.</p> : detail.provenance.length === 0 ? <p className="workspace-widget-muted">No supporting evidence is available for this connection.</p> : <ul className="network-evidence-list">{detail.provenance.map((source) => <li key={source.id}><strong>{source.sourceFirNumber}</strong><span>{source.sourceCaseTitle}</span><Link href={`/api/evidence/${source.evidenceId}`} target="_blank">Open {source.evidenceFilename}</Link>{source.note ? <small>{source.note}</small> : null}</li>)}</ul>}</article>;
}
