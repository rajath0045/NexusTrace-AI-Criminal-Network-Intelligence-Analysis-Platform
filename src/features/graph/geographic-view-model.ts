import type {
  GeographicConnection,
  GeographicConnectionRecord,
  GeographicProjection,
  GeolocatedActivityRecord,
  LocationObservationView,
  TemporalLocationResolution,
} from "@/domain/geography";
import { serializeGraphNeighborhood, type SerializedGraphNeighborhood } from "./graph-view-model";

export interface SerializedLocationObservation extends Omit<LocationObservationView, "observedAt"> {
  observedAt: string;
}

export interface SerializedTemporalLocationResolution extends Omit<TemporalLocationResolution, "eventAt" | "observation"> {
  eventAt: string;
  observation: SerializedLocationObservation | null;
}

export interface SerializedGeographicActivity extends Omit<GeolocatedActivityRecord, "occurredAt" | "sourceLocation" | "destinationLocation"> {
  occurredAt: string;
  sourceLocation: SerializedTemporalLocationResolution;
  destinationLocation: SerializedTemporalLocationResolution;
}

export interface SerializedConnectionRecord extends Omit<GeographicConnectionRecord, "occurredAt" | "sourceLocation" | "destinationLocation"> {
  occurredAt: string | null;
  sourceLocation: SerializedTemporalLocationResolution | null;
  destinationLocation: SerializedTemporalLocationResolution | null;
}

export interface SerializedGeographicConnection extends Omit<GeographicConnection, "sourceObservation" | "targetObservation" | "records"> {
  sourceObservation: SerializedLocationObservation | null;
  targetObservation: SerializedLocationObservation | null;
  records: SerializedConnectionRecord[];
}

export interface SerializedGeographicProjection extends Omit<GeographicProjection, "graph" | "observations" | "connections" | "activities" | "timeline" | "findings" | "generatedAt"> {
  graph: SerializedGraphNeighborhood;
  observations: SerializedLocationObservation[];
  connections: SerializedGeographicConnection[];
  activities: SerializedGeographicActivity[];
  timeline: Array<Omit<GeographicProjection["timeline"][number], "timestamp"> & { timestamp: string }>;
  findings: Array<Omit<GeographicProjection["findings"][number], "generatedAt"> & { generatedAt: string }>;
  generatedAt: string;
}

function observation(value: LocationObservationView | null): SerializedLocationObservation | null {
  return value ? { ...value, observedAt: value.observedAt.toISOString() } : null;
}

function resolution(value: TemporalLocationResolution | null): SerializedTemporalLocationResolution | null {
  return value ? { ...value, eventAt: value.eventAt.toISOString(), observation: observation(value.observation) } : null;
}

export function serializeGeographicProjection(projection: GeographicProjection): SerializedGeographicProjection {
  return {
    ...projection,
    graph: serializeGraphNeighborhood(projection.graph),
    observations: projection.observations.map((item) => observation(item) as SerializedLocationObservation),
    activities: projection.activities.map((item) => ({
      ...item,
      occurredAt: item.occurredAt.toISOString(),
      sourceLocation: resolution(item.sourceLocation) as SerializedTemporalLocationResolution,
      destinationLocation: resolution(item.destinationLocation) as SerializedTemporalLocationResolution,
    })),
    connections: projection.connections.map((connection) => ({
      ...connection,
      sourceObservation: observation(connection.sourceObservation),
      targetObservation: observation(connection.targetObservation),
      records: connection.records.map((record) => ({
        ...record,
        occurredAt: record.occurredAt?.toISOString() ?? null,
        sourceLocation: resolution(record.sourceLocation),
        destinationLocation: resolution(record.destinationLocation),
      })),
    })),
    timeline: projection.timeline.map((item) => ({ ...item, timestamp: item.timestamp.toISOString() })),
    findings: projection.findings.map((item) => ({ ...item, generatedAt: item.generatedAt.toISOString() })),
    generatedAt: projection.generatedAt.toISOString(),
  };
}
