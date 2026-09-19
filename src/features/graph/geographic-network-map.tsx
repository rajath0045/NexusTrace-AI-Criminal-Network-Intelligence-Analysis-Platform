"use client";

import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import {
  Building2,
  Car,
  FileSearch,
  House,
  Landmark,
  MapPin,
  MessageSquare,
  Phone,
  CreditCard,
  Smartphone,
  TriangleAlert,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import * as MapLibreGL from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map as MapCanvas, MapMarker, MarkerContent, MarkerLabel, MarkerTooltip, useMap } from "@/components/ui/mapcn-marker-tooltip";
import { GraphEntityType, IncidentVerificationLevel, LocationObservationType, RelationshipStrength } from "@/domain/model";
import type { SerializedGeographicConnection, SerializedGeographicProjection, SerializedLocationObservation } from "./geographic-view-model";

const tierColors: Record<RelationshipStrength, string> = {
  [RelationshipStrength.Primary]: "#ff365e",
  [RelationshipStrength.Secondary]: "#2f9bff",
  [RelationshipStrength.Tertiary]: "#f5db45",
};

export const observationClustering = { cluster: true, clusterMaxZoom: 13, clusterRadius: 48 } as const;

export const verificationStyles = {
  [IncidentVerificationLevel.CrossVerified]: { opacity: 0.98, dashed: false, glow: true },
  [IncidentVerificationLevel.DepartmentVerified]: { opacity: 0.88, dashed: false, glow: false },
  [IncidentVerificationLevel.Unverified]: { opacity: 0.42, dashed: true, glow: false },
  VERIFIED: { opacity: 0.86, dashed: false, glow: false },
  PENDING: { opacity: 0.54, dashed: true, glow: false },
  CHANGES_REQUESTED: { opacity: 0.42, dashed: true, glow: false },
  REJECTED: { opacity: 0.3, dashed: true, glow: false },
} as const;

const iconByEntity: Record<GraphEntityType, LucideIcon> = {
  [GraphEntityType.Person]: UserRound,
  [GraphEntityType.Vehicle]: Car,
  [GraphEntityType.Property]: Building2,
  [GraphEntityType.Phone]: Phone,
  [GraphEntityType.Device]: Smartphone,
  [GraphEntityType.BankAccount]: Landmark,
  [GraphEntityType.Organization]: Building2,
  [GraphEntityType.Location]: MapPin,
  [GraphEntityType.Case]: FileSearch,
  [GraphEntityType.Incident]: TriangleAlert,
};

function observationIcon(observation: SerializedLocationObservation): LucideIcon {
  if (observation.observationType === LocationObservationType.Residence) return House;
  if (observation.observationType === LocationObservationType.Property) return Building2;
  if (observation.observationType === LocationObservationType.VehicleObservation) return Car;
  if (observation.observationType === LocationObservationType.DeviceObservation) return observation.entityType === GraphEntityType.Phone ? Phone : Smartphone;
  if (observation.observationType === LocationObservationType.IncidentLocation) return TriangleAlert;
  if (observation.observationType === LocationObservationType.EvidenceLocation) return FileSearch;
  return iconByEntity[observation.entityType] ?? MapPin;
}

function curvedCoordinates(connection: SerializedGeographicConnection): [number, number][] | null {
  const source = connection.sourceObservation;
  const target = connection.targetObservation;
  if (!source || !target) return null;
  const dx = target.longitude - source.longitude;
  const dy = target.latitude - source.latitude;
  const length = Math.hypot(dx, dy) || 1;
  const curvature = Math.min(0.018, length * 0.12);
  const midpoint: [number, number] = [
    (source.longitude + target.longitude) / 2 - (dy / length) * curvature,
    (source.latitude + target.latitude) / 2 + (dx / length) * curvature,
  ];
  return [[source.longitude, source.latitude], midpoint, [target.longitude, target.latitude]];
}

export function buildObservationGeoJson(observations: SerializedLocationObservation[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: observations.map((observation): Feature<Point> => ({
      type: "Feature",
      id: observation.id,
      geometry: { type: "Point", coordinates: [observation.longitude, observation.latitude] },
      properties: { id: observation.id, entityId: observation.graphEntityId, entityType: observation.entityType, observationType: observation.observationType, label: observation.locationLabel, verification: observation.verificationLevel },
    })),
  };
}

export function buildConnectionGeoJson(connections: SerializedGeographicConnection[]): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: connections.flatMap((connection): Feature<LineString>[] => {
      const coordinates = curvedCoordinates(connection);
      if (!coordinates) return [];
      return [{
        type: "Feature",
        id: connection.id,
        geometry: { type: "LineString", coordinates },
        properties: {
          id: connection.id,
          strength: connection.strength ?? "UNTIERED",
          verification: connection.verification,
          calls: connection.counts.calls,
          messages: connection.counts.messages,
          financial: connection.counts.financial,
        },
      }];
    }),
  };
}

function midpoint(connection: SerializedGeographicConnection): [number, number] | null {
  const coordinates = curvedCoordinates(connection);
  return coordinates ? coordinates[1] ?? null : null;
}

function GeographicLayers({ observations, connections, heatmap, fitVersion, recenterVersion, focusEntityId, onEntitySelect, onConnectionSelect }: {
  observations: SerializedLocationObservation[];
  connections: SerializedGeographicConnection[];
  heatmap: boolean;
  fitVersion: number;
  recenterVersion: number;
  focusEntityId: string;
  onEntitySelect: (entityId: string) => void;
  onConnectionSelect: (connectionId: string) => void;
}) {
  const { map, isLoaded } = useMap();
  const onConnectionSelectRef = useRef(onConnectionSelect);
  const onEntitySelectRef = useRef(onEntitySelect);
  const observationData = useMemo(() => buildObservationGeoJson(observations), [observations]);
  const connectionData = useMemo(() => buildConnectionGeoJson(connections), [connections]);
  useEffect(() => { onConnectionSelectRef.current = onConnectionSelect; }, [onConnectionSelect]);
  useEffect(() => { onEntitySelectRef.current = onEntitySelect; }, [onEntitySelect]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    const navigation = new MapLibreGL.NavigationControl({ visualizePitch: true });
    map.addControl(navigation, "bottom-right");
    map.addSource("nexustrace-observations", { type: "geojson", data: observationData, ...observationClustering });
    map.addLayer({ id: "nexustrace-heatmap", type: "heatmap", source: "nexustrace-observations", maxzoom: 14, layout: { visibility: "none" }, paint: { "heatmap-weight": 0.65, "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 13, 1.2], "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)", 0.35, "rgba(47,155,255,0.25)", 0.7, "rgba(245,219,69,0.4)", 1, "rgba(255,54,94,0.58)"], "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 8, 13, 24], "heatmap-opacity": 0.58 } });
    map.addLayer({ id: "nexustrace-observation-clusters", type: "circle", source: "nexustrace-observations", filter: ["has", "point_count"], paint: { "circle-color": "#101d2d", "circle-stroke-color": "#5ca9ff", "circle-stroke-width": 1.5, "circle-radius": ["step", ["get", "point_count"], 15, 10, 19, 30, 24], "circle-opacity": 0.92 } });
    map.addLayer({ id: "nexustrace-observation-cluster-count", type: "symbol", source: "nexustrace-observations", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 11 }, paint: { "text-color": "#eaf3ff" } });
    map.addLayer({ id: "nexustrace-observation-points", type: "circle", source: "nexustrace-observations", filter: ["!", ["has", "point_count"]], paint: { "circle-color": "#5ca9ff", "circle-radius": 3, "circle-opacity": 0.22, "circle-stroke-color": "#d8ebff", "circle-stroke-width": 1 } });
    map.addSource("nexustrace-connections", { type: "geojson", data: connectionData });
    const lineColor = ["match", ["get", "strength"], RelationshipStrength.Primary, tierColors.PRIMARY, RelationshipStrength.Secondary, tierColors.SECONDARY, RelationshipStrength.Tertiary, tierColors.TERTIARY, "#8fa2b8"] as unknown as string;
    map.addLayer({ id: "nexustrace-connections-cross-verified", type: "line", source: "nexustrace-connections", filter: ["==", ["get", "verification"], IncidentVerificationLevel.CrossVerified], paint: { "line-color": lineColor, "line-width": 6, "line-opacity": 0.24, "line-blur": 3 } });
    map.addLayer({ id: "nexustrace-connections", type: "line", source: "nexustrace-connections", paint: { "line-color": lineColor, "line-width": ["match", ["get", "strength"], RelationshipStrength.Primary, 3.2, RelationshipStrength.Secondary, 2.5, RelationshipStrength.Tertiary, 2, 1.5], "line-opacity": ["match", ["get", "verification"], IncidentVerificationLevel.CrossVerified, verificationStyles.CROSS_VERIFIED.opacity, IncidentVerificationLevel.DepartmentVerified, verificationStyles.DEPARTMENT_VERIFIED.opacity, "VERIFIED", verificationStyles.VERIFIED.opacity, "PENDING", verificationStyles.PENDING.opacity, verificationStyles.UNVERIFIED.opacity] } });
    map.addLayer({ id: "nexustrace-connections-unverified", type: "line", source: "nexustrace-connections", filter: ["in", ["get", "verification"], ["literal", [IncidentVerificationLevel.Unverified, "PENDING", "CHANGES_REQUESTED"]]], paint: { "line-color": lineColor, "line-width": 2, "line-opacity": 0.72, "line-dasharray": [2, 2] } });

    const handleConnectionClick = (event: MapLibreGL.MapLayerMouseEvent) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") onConnectionSelectRef.current(id);
    };
    const handleClusterClick = async (event: MapLibreGL.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.cluster_id;
      if (typeof clusterId !== "number" || feature?.geometry.type !== "Point") return;
      const source = map.getSource("nexustrace-observations") as MapLibreGL.GeoJSONSource;
      const zoom = await source.getClusterExpansionZoom(clusterId);
      map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom });
    };
    const handleObservationClick = (event: MapLibreGL.MapLayerMouseEvent) => {
      const entityId = event.features?.[0]?.properties?.entityId;
      if (typeof entityId === "string") onEntitySelectRef.current(entityId);
    };
    map.on("click", "nexustrace-connections", handleConnectionClick);
    map.on("click", "nexustrace-connections-unverified", handleConnectionClick);
    map.on("click", "nexustrace-observation-clusters", handleClusterClick);
    map.on("click", "nexustrace-observation-points", handleObservationClick);
    map.on("mouseenter", "nexustrace-connections", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "nexustrace-connections", () => { map.getCanvas().style.cursor = ""; });

    return () => {
      map.off("click", "nexustrace-connections", handleConnectionClick);
      map.off("click", "nexustrace-connections-unverified", handleConnectionClick);
      map.off("click", "nexustrace-observation-clusters", handleClusterClick);
      map.off("click", "nexustrace-observation-points", handleObservationClick);
      for (const id of ["nexustrace-connections-unverified", "nexustrace-connections", "nexustrace-connections-cross-verified", "nexustrace-observation-points", "nexustrace-observation-cluster-count", "nexustrace-observation-clusters", "nexustrace-heatmap"]) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource("nexustrace-connections")) map.removeSource("nexustrace-connections");
      if (map.getSource("nexustrace-observations")) map.removeSource("nexustrace-observations");
      map.removeControl(navigation);
    };
  }, [connectionData, isLoaded, map, observationData]);

  useEffect(() => {
    if (!map || !isLoaded || !map.getLayer("nexustrace-heatmap")) return;
    map.setLayoutProperty("nexustrace-heatmap", "visibility", heatmap ? "visible" : "none");
  }, [heatmap, isLoaded, map]);

  useEffect(() => {
    if (!map || !isLoaded || observations.length === 0) return;
    const bounds = observations.reduce((value, observation) => value.extend([observation.longitude, observation.latitude]), new MapLibreGL.LngLatBounds());
    map.fitBounds(bounds, { padding: 72, maxZoom: 13, duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450 });
  }, [fitVersion, isLoaded, map, observations]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    const focus = observations.find((observation) => observation.graphEntityId === focusEntityId);
    if (focus) map.easeTo({ center: [focus.longitude, focus.latitude], zoom: Math.max(map.getZoom(), 12), duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 350 });
  }, [focusEntityId, isLoaded, map, observations, recenterVersion]);

  return null;
}

function markerTone(observation: SerializedLocationObservation, focusEntityId: string, selectedEntityId: string | null): string {
  if (observation.graphEntityId === focusEntityId) return "focus";
  if (observation.graphEntityId === selectedEntityId) return "selected";
  if (observation.observationType === LocationObservationType.IncidentLocation) return "incident";
  return "default";
}

export function selectImportantMarkers(observations: SerializedLocationObservation[], focusEntityId: string, selectedEntityId: string | null): SerializedLocationObservation[] {
  const byEntity = new Map<string, SerializedLocationObservation>();
  for (const observation of observations) {
    const current = byEntity.get(observation.graphEntityId);
    if (!current || observation.observedAt > current.observedAt) byEntity.set(observation.graphEntityId, observation);
  }
  const importantTypes = new Set([LocationObservationType.Residence, LocationObservationType.Property, LocationObservationType.VehicleObservation, LocationObservationType.IncidentLocation]);
  return [...byEntity.values()]
    .sort((left, right) => Number(right.graphEntityId === focusEntityId) - Number(left.graphEntityId === focusEntityId)
      || Number(right.graphEntityId === selectedEntityId) - Number(left.graphEntityId === selectedEntityId)
      || Number(importantTypes.has(right.observationType)) - Number(importantTypes.has(left.observationType))
      || right.observedAt.localeCompare(left.observedAt))
    .slice(0, 36);
}

export function GeographicNetworkMap({ projection, selectedEntityId, selectedConnectionId, visibleEntityTypes, showNetwork, showObservations, heatmap, fitVersion, recenterVersion, onEntitySelect, onConnectionSelect }: {
  projection: SerializedGeographicProjection;
  selectedEntityId: string | null;
  selectedConnectionId: string | null;
  visibleEntityTypes: GraphEntityType[];
  showNetwork: boolean;
  showObservations: boolean;
  heatmap: boolean;
  fitVersion: number;
  recenterVersion: number;
  onEntitySelect: (entityId: string) => void;
  onConnectionSelect: (connectionId: string) => void;
}) {
  const [zoom, setZoom] = useState(11);
  const [mapError, setMapError] = useState<string | null>(null);
  const observations = useMemo(() => projection.observations.filter((item) => visibleEntityTypes.includes(item.entityType)), [projection.observations, visibleEntityTypes]);
  const layerObservations = useMemo(() => showObservations ? observations : [], [observations, showObservations]);
  const markers = useMemo(() => showObservations ? selectImportantMarkers(observations, projection.focusEntity.id, selectedEntityId) : [], [observations, projection.focusEntity.id, selectedEntityId, showObservations]);
  const mappedConnections = useMemo(() => showNetwork ? projection.connections.filter((connection) => connection.sourceObservation && connection.targetObservation && visibleEntityTypes.includes(connection.sourceObservation.entityType) && visibleEntityTypes.includes(connection.targetObservation.entityType)) : [], [projection.connections, showNetwork, visibleEntityTypes]);
  const initialCenter = useMemo<[number, number]>(() => {
    const focus = observations.find((item) => item.graphEntityId === projection.focusEntity.id) ?? observations[0];
    return focus ? [focus.longitude, focus.latitude] : [77.5946, 12.9716];
  }, [observations, projection.focusEntity.id]);
  const handleViewport = useCallback((viewport: { zoom: number }) => setZoom(viewport.zoom), []);

  if (observations.length === 0) return <div className="network-map-empty"><MapPin aria-hidden="true" /><strong>No geolocation available</strong><span>{projection.focusEntity.displayLabel} has authorized network relationships, but no geographic observation matches this scope. Switch to Relationship view.</span></div>;
  if (mapError) return <div className="network-map-empty" role="alert"><TriangleAlert aria-hidden="true" /><strong>Geographic basemap unavailable</strong><span>{mapError} Relationship view remains available.</span></div>;

  return (
    <MapCanvas className="network-geographic-map" theme="dark" center={initialCenter} zoom={11} minZoom={3} maxZoom={18} onViewportChange={handleViewport} onError={(error) => setMapError(error.message)}>
      <GeographicLayers observations={layerObservations} connections={mappedConnections} heatmap={heatmap} fitVersion={fitVersion} recenterVersion={recenterVersion} focusEntityId={projection.focusEntity.id} onEntitySelect={onEntitySelect} onConnectionSelect={onConnectionSelect} />
      {markers.map((observation) => {
        const Icon = observationIcon(observation);
        const tone = markerTone(observation, projection.focusEntity.id, selectedEntityId);
        const showLabel = tone !== "default" || zoom >= 12.25 || [LocationObservationType.Residence, LocationObservationType.Property, LocationObservationType.IncidentLocation].includes(observation.observationType);
        return <MapMarker key={observation.id} longitude={observation.longitude} latitude={observation.latitude} anchor="center" onClick={() => onEntitySelect(observation.graphEntityId)}><MarkerContent><button type="button" className={`network-map-marker is-${tone}`} aria-label={`Select ${observation.entityLabel}`} aria-pressed={selectedEntityId === observation.graphEntityId}><span className="network-map-marker-glow" /><Icon aria-hidden="true" size={16} strokeWidth={1.8} />{showLabel ? <MarkerLabel className="network-map-marker-label">{observation.entityLabel}</MarkerLabel> : null}</button></MarkerContent><MarkerTooltip className="network-map-tooltip"><strong>{observation.entityLabel}</strong><span>{observation.locationLabel}</span><small>{observation.observationType.replaceAll("_", " ")} · {observation.verificationLevel.replaceAll("_", " ")}</small></MarkerTooltip></MapMarker>;
      })}
      {mappedConnections.filter((connection) => connection.counts.calls + connection.counts.messages + connection.counts.financial > 0).map((connection) => {
        const position = midpoint(connection);
        if (!position) return null;
        return <MapMarker key={`activity-${connection.id}`} longitude={position[0]} latitude={position[1]} anchor="center" onClick={() => onConnectionSelect(connection.id)}><MarkerContent><button type="button" className={`network-map-call-badge${selectedConnectionId === connection.id ? " is-selected" : ""}`} aria-label={`Inspect activity between ${connection.sourceLabel} and ${connection.targetLabel}`}>{connection.counts.calls > 0 ? <><Phone aria-hidden="true" size={13} /><span>{connection.counts.calls}</span></> : null}{connection.counts.messages > 0 ? <><MessageSquare aria-hidden="true" size={13} /><span>{connection.counts.messages}</span></> : null}{connection.counts.financial > 0 ? <><CreditCard aria-hidden="true" size={13} /><span>{connection.counts.financial}</span></> : null}</button></MarkerContent><MarkerTooltip className="network-map-tooltip"><strong>Bundled activity connection</strong><span>{connection.sourceLabel} → {connection.targetLabel}</span><small>{connection.counts.calls} calls · {connection.counts.messages} messages · {connection.counts.financial} transactions</small></MarkerTooltip></MapMarker>;
      })}
    </MapCanvas>
  );
}

export { observationIcon, tierColors };
