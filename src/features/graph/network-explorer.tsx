"use client";

import { Layers3, LocateFixed, Map, Network, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { GraphEntityType, RelationshipStrength, VerificationState } from "@/domain/model";
import type { WorkspaceLayoutItem } from "@/domain/workspace";
import { WorkspaceGrid } from "@/features/workspace/workspace-grid";
import { GeographicNetworkMap } from "./geographic-network-map";
import type { SerializedGeographicConnection, SerializedGeographicProjection } from "./geographic-view-model";
import { NetworkCanvas } from "./network-canvas";
import {
  ActivityQueue,
  AnalystContext,
  ConnectionDetailsPanel,
  EventTimeline,
  InvestigationActions,
  InvestigationContext,
  RelatedCasesPanel,
  SelectedEntityPanel,
  SignalPanel,
  titleCase,
} from "./network-console-panels";

interface NetworkExplorerProps {
  initialProjection: SerializedGeographicProjection;
  initialLayoutItems: WorkspaceLayoutItem[];
}

type ViewMode = "map" | "relationship";
type TimeRange = "24H" | "7D" | "45D" | "CUSTOM";

const relationshipTiers = [RelationshipStrength.Primary, RelationshipStrength.Secondary, RelationshipStrength.Tertiary] as const;
const verificationFilters = [VerificationState.Verified, VerificationState.Pending, VerificationState.ChangesRequested, VerificationState.Rejected] as const;
const geographicEntityTypes = [GraphEntityType.Person, GraphEntityType.Property, GraphEntityType.Vehicle, GraphEntityType.Phone, GraphEntityType.Device, GraphEntityType.Incident, GraphEntityType.Location] as const;

function rangeDates(range: Exclude<TimeRange, "CUSTOM">): { startTime: string; endTime: string } {
  const end = new Date();
  const days = range === "24H" ? 1 : range === "7D" ? 7 : 45;
  return { startTime: new Date(end.getTime() - days * 24 * 60 * 60 * 1_000).toISOString(), endTime: end.toISOString() };
}

function projectionUrl({ focus, hops, strengths, verificationStates, startTime, endTime }: { focus: string; hops: number; strengths: RelationshipStrength[]; verificationStates: VerificationState[]; startTime?: string; endTime?: string }): string {
  const parameters = new URLSearchParams({ focus, hops: String(hops), strengths: strengths.join(","), verificationStates: verificationStates.join(",") });
  if (startTime) parameters.set("startTime", startTime);
  if (endTime) parameters.set("endTime", endTime);
  return `/api/network/geographic?${parameters.toString()}`;
}

function connectionForRelationship(projection: SerializedGeographicProjection, relationshipId: string): SerializedGeographicConnection | null {
  return projection.connections.find((connection) => connection.relationshipIds.includes(relationshipId)) ?? null;
}

export function NetworkExplorer({ initialProjection, initialLayoutItems }: NetworkExplorerProps) {
  const [projection, setProjection] = useState(initialProjection);
  const [view, setView] = useState<ViewMode>("map");
  const [strengths, setStrengths] = useState<RelationshipStrength[]>(initialProjection.graph.activeFilters.strengths);
  const [verificationStates, setVerificationStates] = useState<VerificationState[]>(initialProjection.graph.activeFilters.verificationStates);
  const [hops, setHops] = useState(initialProjection.graph.activeFilters.hops);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(initialProjection.focusEntity.id);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [entityTypes, setEntityTypes] = useState<GraphEntityType[]>([...geographicEntityTypes]);
  const [relationshipTypes, setRelationshipTypes] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("45D");
  const [timeWindow, setTimeWindow] = useState<ReturnType<typeof rangeDates>>(() => rangeDates("45D"));
  const [layers, setLayers] = useState({ network: true, observations: true, heatmap: false });
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [legendOpen, setLegendOpen] = useState(false);
  const [fitVersion, setFitVersion] = useState(0);
  const [recenterVersion, setRecenterVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableRelationshipTypes = useMemo(() => [...new Set(projection.graph.edges.map((edge) => edge.relationshipType))].sort(), [projection.graph.edges]);
  const filteredEdges = useMemo(() => relationshipTypes.length === 0 ? projection.graph.edges : projection.graph.edges.filter((edge) => relationshipTypes.includes(edge.relationshipType)), [projection.graph.edges, relationshipTypes]);
  const visibleConnectionIds = useMemo(() => new Set(filteredEdges.map((edge) => edge.id)), [filteredEdges]);
  const filteredConnections = useMemo(() => relationshipTypes.length === 0 ? projection.connections : projection.connections.filter((connection) => connection.relationshipIds.length === 0 || connection.relationshipIds.some((id) => visibleConnectionIds.has(id))), [projection.connections, relationshipTypes.length, visibleConnectionIds]);
  const mapProjection = useMemo(() => ({ ...projection, connections: filteredConnections }), [filteredConnections, projection]);
  const selectedConnection = useMemo(() => projection.connections.find((item) => item.id === selectedConnectionId) ?? null, [projection.connections, selectedConnectionId]);

  const requestProjection = useCallback(async (overrides: Partial<{ focus: string; hops: 1 | 2 | 3; strengths: RelationshipStrength[]; verificationStates: VerificationState[]; startTime: string; endTime: string }> = {}) => {
    const query = {
      focus: overrides.focus ?? projection.focusEntity.id,
      hops: overrides.hops ?? hops,
      strengths: overrides.strengths ?? strengths,
      verificationStates: overrides.verificationStates ?? verificationStates,
      startTime: overrides.startTime ?? timeWindow.startTime,
      endTime: overrides.endTime ?? timeWindow.endTime,
    };
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(projectionUrl(query), { credentials: "same-origin" });
      if (!response.ok) throw new Error("Projection request failed");
      const next = await response.json() as SerializedGeographicProjection;
      setProjection(next);
      setSelectedEntityId(next.focusEntity.id);
      setSelectedConnectionId(null);
      setFitVersion((value) => value + 1);
    } catch {
      setError("The authorized geographic network could not be loaded. Your current view is unchanged.");
    } finally {
      setLoading(false);
    }
  }, [hops, projection.focusEntity.id, strengths, timeWindow.endTime, timeWindow.startTime, verificationStates]);

  const pivotFocus = useCallback((entityId: string) => {
    setSelectedEntityId(entityId);
    setSelectedConnectionId(null);
    void requestProjection({ focus: entityId });
  }, [requestProjection]);

  const toggleStrength = (tier: RelationshipStrength) => {
    const next = strengths.includes(tier) ? strengths.filter((value) => value !== tier) : [...strengths, tier];
    if (next.length === 0) return;
    setStrengths(next);
    void requestProjection({ strengths: next });
  };
  const toggleVerification = (state: VerificationState) => {
    const next = verificationStates.includes(state) ? verificationStates.filter((value) => value !== state) : [...verificationStates, state];
    if (next.length === 0) return;
    setVerificationStates(next);
    void requestProjection({ verificationStates: next });
  };
  const selectHops = (value: 1 | 2 | 3) => { setHops(value); void requestProjection({ hops: value }); };
  const selectRange = (range: Exclude<TimeRange, "CUSTOM">) => {
    const next = rangeDates(range);
    setTimeRange(range);
    setTimeWindow(next);
    void requestProjection(next);
  };
  const selectTimelineWindow = (startTime: string, endTime: string) => {
    setTimeRange("CUSTOM");
    setTimeWindow({ startTime, endTime });
    void requestProjection({ startTime, endTime });
  };
  const selectConnection = (id: string) => { setSelectedConnectionId(id); setSelectedEntityId(null); };
  const selectRelationship = (id: string) => {
    const connection = connectionForRelationship(projection, id);
    if (connection) selectConnection(connection.id);
  };

  const widgets = [
    { id: "communication-signals", content: <SignalPanel eyebrow="Communication signals" title="Authorized contact activity" facts={[["Records", projection.summary.communicationCount], ["Bundled paths", projection.connections.filter((item) => item.counts.calls + item.counts.messages + item.counts.emails + item.counts.digitalContacts > 0).length], ["Unknown endpoints", projection.summary.unknownEndpointCount]]} /> },
    { id: "financial-signals", content: <SignalPanel eyebrow="Financial signals" title="Linked transaction activity" facts={[["Records", projection.summary.financialCount], ["Geolocated paths", projection.connections.filter((item) => item.counts.financial > 0 && item.sourceObservation && item.targetObservation).length], ["Review scope", "Current window"]]} /> },
    { id: "verification-summary", content: <SignalPanel eyebrow="Verification summary" title="Evidence confidence" facts={[["Verified observations", projection.summary.verifiedObservationCount], ["Visible connections", projection.connections.length], ["Evidence records", projection.summary.evidenceCount]]} /> },
    { id: "related-cases", content: <RelatedCasesPanel projection={projection} /> },
    { id: "supporting-evidence", content: <SignalPanel eyebrow="Evidence summary" title="Authorized provenance" facts={[["Source evidence", projection.summary.evidenceCount], ["Related cases", projection.summary.relatedCaseCount], ["Generated", new Intl.DateTimeFormat("en-IN", { timeStyle: "short", timeZone: "UTC" }).format(new Date(projection.generatedAt)) + " UTC"]]} /> },
  ];

  return <div className="network-console">
    <EventTimeline projection={projection} onWindowSelect={selectTimelineWindow} />
    <div className="network-console-grid">
      <aside className="network-analysis-rail network-analysis-left">
        <InvestigationContext projection={projection} />
        <section className="network-rail-panel network-filter-panel"><header><SlidersHorizontal aria-hidden="true" /><div><span className="eyebrow">Network filters</span><h2>Authorized scope</h2></div><button type="button" className="network-icon-button" aria-label={filtersOpen ? "Collapse network filters" : "Expand network filters"} aria-expanded={filtersOpen} onClick={() => setFiltersOpen((value) => !value)}>{filtersOpen ? <X aria-hidden="true" /> : <SlidersHorizontal aria-hidden="true" />}</button></header>{filtersOpen ? <div className="network-filter-stack">
          <FilterGroup label="Relationship tier">{relationshipTiers.map((tier) => <FilterButton key={tier} label={titleCase(tier)} pressed={strengths.includes(tier)} tone={tier.toLowerCase()} onClick={() => toggleStrength(tier)} />)}</FilterGroup>
          <FilterGroup label="Traversal">{[1, 2, 3].map((value) => <FilterButton key={value} label={`${value} hop${value === 1 ? "" : "s"}`} pressed={hops === value} onClick={() => selectHops(value as 1 | 2 | 3)} />)}</FilterGroup>
          <FilterGroup label="Verification">{verificationFilters.map((state) => <FilterButton key={state} label={titleCase(state)} pressed={verificationStates.includes(state)} onClick={() => toggleVerification(state)} />)}</FilterGroup>
          <FilterGroup label="Time range">{(["24H", "7D", "45D"] as const).map((range) => <FilterButton key={range} label={range} pressed={timeRange === range} onClick={() => selectRange(range)} />)}{timeRange === "CUSTOM" ? <span className="network-filter-note">Timeline window</span> : null}</FilterGroup>
          <FilterGroup label="Entity type">{geographicEntityTypes.map((type) => <FilterButton key={type} label={titleCase(type)} pressed={entityTypes.includes(type)} onClick={() => setEntityTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type])} />)}</FilterGroup>
          {availableRelationshipTypes.length > 0 ? <FilterGroup label="Relationship type">{availableRelationshipTypes.map((type) => <FilterButton key={type} label={titleCase(type)} pressed={relationshipTypes.length === 0 || relationshipTypes.includes(type)} onClick={() => setRelationshipTypes((current) => current.length === 0 ? [type] : current.includes(type) ? current.filter((item) => item !== type) : [...current, type])} />)}</FilterGroup> : null}
          <FilterGroup label="Layers"><FilterButton label="Network" pressed={layers.network} onClick={() => setLayers((value) => ({ ...value, network: !value.network }))} /><FilterButton label="Observations" pressed={layers.observations} onClick={() => setLayers((value) => ({ ...value, observations: !value.observations }))} /><FilterButton label="Activity heatmap" pressed={layers.heatmap} onClick={() => setLayers((value) => ({ ...value, heatmap: !value.heatmap }))} /></FilterGroup>
        </div> : null}</section>
        <ActivityQueue projection={projection} onConnectionSelect={selectConnection} />
      </aside>

      <main className="network-primary-surface" aria-busy={loading}>
        <div className="network-surface-toolbar"><div className="network-view-switch" role="group" aria-label="Network view"><button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}><Map aria-hidden="true" /> Geographic</button><button type="button" aria-pressed={view === "relationship"} onClick={() => setView("relationship")}><Network aria-hidden="true" /> Relationship</button></div><div className="network-map-actions"><button type="button" onClick={() => setFitVersion((value) => value + 1)}>Fit</button><button type="button" onClick={() => setRecenterVersion((value) => value + 1)}><LocateFixed aria-hidden="true" /> Recenter</button><button type="button" onClick={() => { setSelectedEntityId(projection.focusEntity.id); setSelectedConnectionId(null); setRecenterVersion((value) => value + 1); }}>Clear focus</button><button type="button" aria-expanded={legendOpen} onClick={() => setLegendOpen((value) => !value)}><Layers3 aria-hidden="true" /> Legend</button></div></div>
        {legendOpen ? <GraphLegend /> : null}
        {error ? <p className="network-alert" role="alert">{error}</p> : null}
        {loading ? <div className="network-loading">Refreshing authorized geographic projection…</div> : null}
        <section className="network-investigation-canvas">
          <div className="network-canvas-header"><div><span className="eyebrow">Shared focus</span><strong>{projection.focusEntity.displayLabel}</strong><span>{titleCase(projection.focusEntity.entityType)} · {hops} hop{hops === 1 ? "" : "s"}</span></div><p className="network-canvas-instruction">Select an entity to pivot the map, relationship graph, timeline, and analysis panels together.</p></div>
          {view === "map" ? <GeographicNetworkMap projection={mapProjection} selectedEntityId={selectedEntityId} selectedConnectionId={selectedConnectionId} visibleEntityTypes={entityTypes} showNetwork={layers.network} showObservations={layers.observations} heatmap={layers.heatmap} fitVersion={fitVersion} recenterVersion={recenterVersion} onEntitySelect={pivotFocus} onConnectionSelect={selectConnection} onSwitchToRelationship={() => setView("relationship")} /> : filteredEdges.length === 0 ? <div className="network-empty"><strong>No authorized relationships match these filters.</strong><span>Enable another relationship type, tier, verification state, or traversal depth.</span></div> : <NetworkCanvas focusEntityId={projection.focusEntity.id} nodes={projection.graph.nodes} edges={filteredEdges} selectedNodeId={selectedEntityId} selectedEdgeId={selectedConnection?.relationshipIds[0] ?? null} focusMode={selectedEntityId !== null && selectedEntityId !== projection.focusEntity.id} fitVersion={fitVersion} recenterVersion={recenterVersion} onNodeSelect={pivotFocus} onEdgeSelect={selectRelationship} />}
        </section>
      </main>

      <aside className="network-analysis-rail network-analysis-right"><SelectedEntityPanel projection={projection} entityId={selectedEntityId} onFocus={pivotFocus} /><ConnectionDetailsPanel connection={selectedConnection} /><AnalystContext projection={projection} /><InvestigationActions focusType={projection.focusEntity.entityType} /></aside>
    </div>
    <WorkspaceGrid workspaceKey="graph" initialItems={initialLayoutItems} widgets={widgets} ariaLabel="Network signal context panels" maxColumns={5} cellSize={230} />
  </div>;
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <fieldset><legend>{label}</legend><div>{children}</div></fieldset>;
}

function FilterButton({ label, pressed, tone, onClick }: { label: string; pressed: boolean; tone?: string; onClick: () => void }) {
  return <button type="button" className={tone ? `is-${tone}` : undefined} aria-label={label.endsWith("s") || label.includes(" ") ? label : `${label} relationships`} aria-pressed={pressed} onClick={onClick}>{label}</button>;
}

function GraphLegend() {
  return <aside className="network-legend-popover" aria-label="Network legend"><div><p className="eyebrow">Relationship tier</p><span><i className="legend-line" /> Primary</span><span><i className="legend-secondary" /> Secondary</span><span><i className="legend-tertiary" /> Tertiary</span></div><div><p className="eyebrow">Verification</p><span><i className="legend-solid" /> Verified</span><span><i className="legend-dotted" /> Pending / unverified</span></div></aside>;
}
