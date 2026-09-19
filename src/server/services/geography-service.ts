import type { Actor } from "@/domain/auth";
import { NotFoundError, ValidationError } from "@/domain/errors";
import {
  geographicProjectionQuerySchema,
  locationObservationInputSchema,
  temporalPresenceObservationTypes,
  type GeographicConnection,
  type GeographicConnectionRecord,
  type GeographicProjection,
  type GeographicProjectionQuery,
  type GeolocatedActivityRecord,
  type LocationObservationInput,
  type LocationObservationView,
  type TemporalLocationResolution,
} from "@/domain/geography";
import type { GraphNeighborhood } from "@/domain/graph";
import { graphIdSchema } from "@/domain/graph";
import type { TimelineItem } from "@/domain/incident";
import { IncidentVerificationLevel, RelationshipStrength } from "@/domain/model";
import { assertCan } from "@/server/authorization/policy";
import type { GeographyRepository } from "@/server/repositories/geography-repository";
import { PrismaGeographyRepository } from "@/server/repositories/prisma-geography-repository";
import { getNeighborhood } from "./graph-service";
import { getTimeline } from "./incident-service";

type GraphReader = (actor: Actor, rootEntityId: string, filters: Pick<GeographicProjectionQuery, "hops" | "strengths" | "verificationStates">) => Promise<GraphNeighborhood>;
type TimelineReader = (actor: Actor, query: { personId?: string; caseId?: string; incidentId?: string; startTime?: Date; endTime?: Date; types: ["ALL"] }) => Promise<TimelineItem[]>;

const strengthRank: Record<RelationshipStrength, number> = {
  [RelationshipStrength.Primary]: 3,
  [RelationshipStrength.Secondary]: 2,
  [RelationshipStrength.Tertiary]: 1,
};

const verificationRank: Record<string, number> = {
  CROSS_VERIFIED: 5,
  DEPARTMENT_VERIFIED: 4,
  VERIFIED: 3,
  PENDING: 2,
  UNVERIFIED: 1,
  CHANGES_REQUESTED: 1,
  REJECTED: 0,
};

function parseOrValidation<T>(result: { success: true; data: T } | { success: false }): T {
  if (!result.success) throw new ValidationError("The geographic investigation request is invalid.");
  return result.data;
}

export function resolveLocationFromObservations(
  observations: LocationObservationView[],
  entityId: string,
  eventAt: Date,
  allowedWindowMinutes: number,
): TemporalLocationResolution {
  const maximumDistance = allowedWindowMinutes * 60 * 1_000;
  const eligible = observations.filter((observation) =>
    observation.graphEntityId === entityId
    && temporalPresenceObservationTypes.includes(observation.observationType as typeof temporalPresenceObservationTypes[number])
    && Math.abs(observation.observedAt.getTime() - eventAt.getTime()) <= maximumDistance,
  );
  const observation = eligible.reduce<LocationObservationView | null>((closest, candidate) => {
    if (!closest) return candidate;
    const closestDistance = Math.abs(closest.observedAt.getTime() - eventAt.getTime());
    const candidateDistance = Math.abs(candidate.observedAt.getTime() - eventAt.getTime());
    return candidateDistance < closestDistance || (candidateDistance === closestDistance && candidate.id < closest.id) ? candidate : closest;
  }, null);
  return observation ? {
    status: "KNOWN",
    eventAt,
    temporalDistanceSeconds: Math.round(Math.abs(observation.observedAt.getTime() - eventAt.getTime()) / 1_000),
    observation,
  } : { status: "UNKNOWN", eventAt, temporalDistanceSeconds: null, observation: null };
}

function pairKey(sourceId: string, targetId: string): string {
  return [sourceId, targetId].sort().join(":");
}

function strongerStrength(current: RelationshipStrength | null, candidate: RelationshipStrength): RelationshipStrength {
  return !current || strengthRank[candidate] > strengthRank[current] ? candidate : current;
}

function strongerVerification(current: string, candidate: string): string {
  return (verificationRank[candidate] ?? 0) > (verificationRank[current] ?? 0) ? candidate : current;
}

function latestObservationByEntity(observations: LocationObservationView[]): Map<string, LocationObservationView> {
  const positions = new Map<string, LocationObservationView>();
  for (const observation of observations) {
    const current = positions.get(observation.graphEntityId);
    if (!current || observation.observedAt > current.observedAt) positions.set(observation.graphEntityId, observation);
  }
  return positions;
}

function mergeObservationTimeline(
  graph: GraphNeighborhood,
  timeline: TimelineItem[],
  observations: LocationObservationView[],
  activities: GeolocatedActivityRecord[],
  startTime: Date,
  endTime: Date,
): TimelineItem[] {
  const entityById = new Map(graph.nodes.map((node) => [node.id, node]));
  const activityById = new Map(activities.map((activity) => [activity.id, activity]));
  const eligible = observations.filter((observation) =>
    temporalPresenceObservationTypes.includes(observation.observationType as typeof temporalPresenceObservationTypes[number])
    && observation.observedAt >= startTime
    && observation.observedAt <= endTime,
  );
  const observationsBySource = new Map<string, LocationObservationView[]>();
  for (const observation of eligible) {
    const key = `${observation.sourceRecordType}:${observation.sourceRecordId}`;
    observationsBySource.set(key, [...(observationsBySource.get(key) ?? []), observation]);
  }
  const representedObservationIds = new Set<string>();
  const enrichedTimeline = timeline.map((item) => {
    const linked = observationsBySource.get(`${item.sourceRecordType}:${item.sourceRecordId}`) ?? [];
    if (linked.length === 0) return item;
    linked.forEach((observation) => representedObservationIds.add(observation.id));
    const geographicContext = linked.map((observation) =>
      `${observation.entityLabel} at ${observation.locationLabel} (${observation.observationType.replaceAll("_", " ")}; ${observation.verificationLevel.replaceAll("_", " ")}; observation ${observation.id})`,
    ).join(" | ");
    return { ...item, description: `${item.description} · Geographic context: ${geographicContext}` };
  });
  const standalone = eligible
    .filter((observation) => !representedObservationIds.has(observation.id))
    .map((observation): TimelineItem => {
      const entity = entityById.get(observation.graphEntityId);
      const activity = activityById.get(observation.sourceRecordId);
      return {
        id: `location:${observation.id}`,
        type: "LOCATION",
        timestamp: observation.observedAt,
        title: `${observation.entityLabel}: ${observation.observationType.replaceAll("_", " ")}`,
        description: `${observation.locationLabel}${observation.context ? ` · ${observation.context}` : ""} · Source ${observation.sourceRecordType} ${observation.sourceRecordId} · ${observation.verificationLevel.replaceAll("_", " ")}`,
        sourceRecordType: "LOCATION_OBSERVATION",
        sourceRecordId: observation.id,
        caseId: observation.sourceRecordType === "CASE" ? observation.sourceRecordId : activity?.caseId ?? null,
        incidentId: observation.sourceRecordType === "INCIDENT" ? observation.sourceRecordId : entity?.canonicalRecord?.type === "INCIDENT" ? entity.canonicalRecord.id : activity?.incidentId ?? null,
        personIds: entity?.canonicalRecord?.type === "PERSON" ? [entity.canonicalRecord.id] : [],
        evidenceId: observation.sourceEvidenceId,
      };
    });
  return [...enrichedTimeline, ...standalone];
}

function bundleConnections(
  graph: GraphNeighborhood,
  activities: GeolocatedActivityRecord[],
  observations: LocationObservationView[],
): GeographicConnection[] {
  const positions = latestObservationByEntity(observations);
  const entityById = new Map(graph.nodes.map((node) => [node.id, node]));
  const bundles = new Map<string, GeographicConnection>();
  const ensure = (sourceId: string, targetId: string, sourceLabel: string, targetLabel: string): GeographicConnection => {
    const key = pairKey(sourceId, targetId);
    const existing = bundles.get(key);
    if (existing) return existing;
    const connection: GeographicConnection = {
      id: key,
      sourceEntityId: sourceId,
      targetEntityId: targetId,
      sourceLabel,
      targetLabel,
      sourceObservation: positions.get(sourceId) ?? null,
      targetObservation: positions.get(targetId) ?? null,
      strength: null,
      verification: IncidentVerificationLevel.Unverified,
      relationshipIds: [],
      counts: { calls: 0, messages: 0, emails: 0, digitalContacts: 0, financial: 0, relationships: 0 },
      records: [],
    };
    bundles.set(key, connection);
    return connection;
  };

  for (const edge of graph.edges) {
    const source = entityById.get(edge.sourceId);
    const target = entityById.get(edge.targetId);
    if (!source || !target) continue;
    const bundle = ensure(edge.sourceId, edge.targetId, source.displayLabel, target.displayLabel);
    bundle.strength = strongerStrength(bundle.strength, edge.strength);
    bundle.verification = strongerVerification(bundle.verification, edge.verificationState);
    bundle.relationshipIds.push(edge.id);
    bundle.counts.relationships += 1;
    bundle.records.push({
      id: edge.id,
      kind: "RELATIONSHIP",
      label: edge.relationshipType,
      occurredAt: edge.latestObservedAt ?? edge.firstObservedAt,
      interactionCount: edge.interactionCount,
      verification: edge.verificationState,
      sourceEvidenceId: null,
      caseId: null,
      caseFirNumber: null,
      sourceLocation: null,
      destinationLocation: null,
      durationSeconds: null,
      amount: null,
      currency: null,
    });
  }

  for (const activity of activities) {
    const bundle = ensure(activity.sourceEntityId, activity.destinationEntityId, activity.sourceLabel, activity.destinationLabel);
    bundle.verification = strongerVerification(bundle.verification, activity.verificationLevel);
    if (activity.sourceLocation.observation && activity.destinationLocation.observation) {
      bundle.sourceObservation = activity.sourceLocation.observation;
      bundle.targetObservation = activity.destinationLocation.observation;
    }
    if (activity.kind === "FINANCIAL") bundle.counts.financial += 1;
    else if (activity.subtype === "CALL") bundle.counts.calls += 1;
    else if (activity.subtype === "MESSAGE") bundle.counts.messages += 1;
    else if (activity.subtype === "EMAIL") bundle.counts.emails += 1;
    else bundle.counts.digitalContacts += 1;
    const record: GeographicConnectionRecord = {
      id: activity.id,
      kind: activity.kind,
      label: `${activity.subtype.replaceAll("_", " ")} · ${activity.recordNumber}`,
      occurredAt: activity.occurredAt,
      interactionCount: 1,
      verification: activity.verificationLevel,
      sourceEvidenceId: activity.sourceEvidenceId,
      caseId: activity.caseId,
      caseFirNumber: activity.caseFirNumber,
      sourceLocation: activity.sourceLocation,
      destinationLocation: activity.destinationLocation,
      durationSeconds: activity.durationSeconds,
      amount: activity.amount,
      currency: activity.currency,
    };
    bundle.records.push(record);
  }

  for (const bundle of bundles.values()) {
    bundle.records.sort((left, right) => (right.occurredAt?.getTime() ?? 0) - (left.occurredAt?.getTime() ?? 0) || left.id.localeCompare(right.id));
    bundle.relationshipIds.sort();
  }
  return [...bundles.values()].sort((left, right) => {
    const rank = (right.strength ? strengthRank[right.strength] : 0) - (left.strength ? strengthRank[left.strength] : 0);
    return rank || left.id.localeCompare(right.id);
  });
}

export class GeographyService {
  constructor(
    private readonly repository: GeographyRepository,
    private readonly graphReader: GraphReader = getNeighborhood,
    private readonly timelineReader: TimelineReader = getTimeline,
  ) {}

  async createObservation(actor: Actor, input: LocationObservationInput): Promise<LocationObservationView> {
    assertCan(actor, "LOCATION_OBSERVATION_CREATE");
    return this.repository.createObservation(actor, parseOrValidation(locationObservationInputSchema.safeParse(input)));
  }

  async resolveEntityLocationAtTime(actor: Actor, entityId: string, eventAt: Date, allowedWindowMinutes = 180): Promise<TemporalLocationResolution> {
    assertCan(actor, "CASE_VIEW");
    if (!graphIdSchema.safeParse(entityId).success || !Number.isInteger(allowedWindowMinutes) || allowedWindowMinutes < 1 || allowedWindowMinutes > 24 * 60) throw new ValidationError("The location-resolution request is invalid.");
    if (!(eventAt instanceof Date) || Number.isNaN(eventAt.getTime())) throw new ValidationError("The location-resolution timestamp is invalid.");
    const observation = await this.repository.findNearestTemporalObservation(actor, entityId, eventAt, allowedWindowMinutes);
    return observation ? {
      status: "KNOWN",
      eventAt,
      temporalDistanceSeconds: Math.round(Math.abs(observation.observedAt.getTime() - eventAt.getTime()) / 1_000),
      observation,
    } : { status: "UNKNOWN", eventAt, temporalDistanceSeconds: null, observation: null };
  }

  async getProjection(actor: Actor, query: GeographicProjectionQuery): Promise<GeographicProjection> {
    assertCan(actor, "CASE_VIEW");
    const parsed = parseOrValidation(geographicProjectionQuerySchema.safeParse(query));
    const effectiveEnd = parsed.endTime ?? new Date();
    const effectiveStart = parsed.startTime ?? new Date(effectiveEnd.getTime() - 45 * 24 * 60 * 60 * 1_000);
    const graph = await this.graphReader(actor, parsed.focusEntityId, {
      hops: parsed.hops,
      strengths: parsed.strengths,
      verificationStates: parsed.verificationStates,
    });
    if (!graph) throw new NotFoundError();
    const entityIds = graph.nodes.map((node) => node.id);
    const expandedWindow = parsed.allowedLocationWindowMinutes * 60 * 1_000;
    const [observations, activityRecords, findings] = await Promise.all([
      this.repository.listObservations(actor, {
        entityIds,
        observationTypes: parsed.observationTypes,
        startTime: new Date(effectiveStart.getTime() - expandedWindow),
        endTime: new Date(effectiveEnd.getTime() + expandedWindow),
      }),
      this.repository.listActivities(actor, { entityIds, startTime: effectiveStart, endTime: effectiveEnd }),
      this.repository.listFindings(actor, graph.focusEntity.canonicalRecord?.type === "PERSON" ? graph.focusEntity.canonicalRecord.id : null),
    ]);
    const activities = activityRecords.map((activity): GeolocatedActivityRecord => ({
      ...activity,
      sourceLocation: resolveLocationFromObservations(observations, activity.sourceEntityId, activity.occurredAt, parsed.allowedLocationWindowMinutes),
      destinationLocation: resolveLocationFromObservations(observations, activity.destinationEntityId, activity.occurredAt, parsed.allowedLocationWindowMinutes),
    }));
    let timeline: TimelineItem[] = [];
    const canonical = graph.focusEntity.canonicalRecord;
    if (canonical) {
      const scope = canonical.type === "PERSON" ? { personId: canonical.id } : canonical.type === "CASE" ? { caseId: canonical.id } : { incidentId: canonical.id };
      timeline = await this.timelineReader(actor, { ...scope, startTime: effectiveStart, endTime: effectiveEnd, types: ["ALL"] });
    }
    timeline = mergeObservationTimeline(graph, timeline, observations, activities, effectiveStart, effectiveEnd)
      .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime() || left.id.localeCompare(right.id))
      .slice(0, 500);
    const connections = bundleConnections(graph, activities, observations);
    const evidenceIds = new Set(activities.flatMap((item) => item.sourceEvidenceId ? [item.sourceEvidenceId] : []));
    const caseIds = new Set(activities.flatMap((item) => item.caseId ? [item.caseId] : []));
    return {
      graph,
      focusEntity: graph.focusEntity,
      observations,
      connections,
      activities,
      timeline,
      findings,
      summary: {
        communicationCount: activities.filter((item) => item.kind === "COMMUNICATION").length,
        financialCount: activities.filter((item) => item.kind === "FINANCIAL").length,
        verifiedObservationCount: observations.filter((item) => item.verificationLevel !== IncidentVerificationLevel.Unverified).length,
        relatedCaseCount: caseIds.size,
        evidenceCount: evidenceIds.size,
        unknownEndpointCount: activities.reduce((count, item) => count + (item.sourceLocation.status === "UNKNOWN" ? 1 : 0) + (item.destinationLocation.status === "UNKNOWN" ? 1 : 0), 0),
      },
      generatedAt: new Date(),
    };
  }
}

const geographyService = new GeographyService(new PrismaGeographyRepository());

export const createLocationObservation = geographyService.createObservation.bind(geographyService);
export const resolveEntityLocationAtTime = geographyService.resolveEntityLocationAtTime.bind(geographyService);
export const getGeographicProjection = geographyService.getProjection.bind(geographyService);
