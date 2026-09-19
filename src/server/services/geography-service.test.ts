// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@/domain/auth";
import type {
  GeographicActivityRecord,
  GeographicFindingSummary,
  LocationObservationInput,
  LocationObservationView,
} from "@/domain/geography";
import type { GraphNeighborhood } from "@/domain/graph";
import {
  EvidenceConfidence,
  GraphEntityType,
  IncidentVerificationLevel,
  LocationObservationType,
  LocationSourceRecordType,
  RelationshipStrength,
  UserRole,
  VerificationState,
} from "@/domain/model";
import type { GeographicActivityQuery, GeographicObservationQuery, GeographyRepository } from "@/server/repositories/geography-repository";
import { GeographyService, resolveLocationFromObservations } from "./geography-service";

const ids = {
  arjun: "60000000-0000-4000-8000-000000000001",
  meera: "60000000-0000-4000-8000-000000000002",
  residence: "60000000-0000-4000-8000-000000000013",
  relationship: "70000000-0000-4000-8000-000000000006",
  communication: "90000000-0000-4000-8000-000000000017",
  case: "30000000-0000-4000-8000-000000000001",
  evidence: "50000000-0000-4000-8000-000000000001",
} as const;

const departmentUser: Actor = { userId: "user", email: "department@nexustrace.demo", displayName: "Department User", role: UserRole.DepartmentUser, departmentId: "cyber" };
const investigator: Actor = { ...departmentUser, role: UserRole.Investigator };
const eventAt = new Date("2026-08-16T20:45:00.000Z");

function observation(overrides: Partial<LocationObservationView> = {}): LocationObservationView {
  return {
    id: "a0000000-0000-4000-8000-000000000001",
    graphEntityId: ids.arjun,
    entityType: GraphEntityType.Person,
    entityLabel: "Arjun Mehta",
    latitude: 12.9784,
    longitude: 77.6408,
    observedAt: new Date("2026-08-16T20:44:00.000Z"),
    observationType: LocationObservationType.ObservedPersonLocation,
    locationLabel: "Location X",
    context: "Authorized observation",
    accuracyMeters: 40,
    sourceRecordType: LocationSourceRecordType.Evidence,
    sourceRecordId: ids.evidence,
    sourceEvidenceId: ids.evidence,
    verificationLevel: IncidentVerificationLevel.DepartmentVerified,
    ...overrides,
  };
}

class MemoryRepository implements GeographyRepository {
  observations: LocationObservationView[] = [];
  activities: GeographicActivityRecord[] = [];
  findings: GeographicFindingSummary[] = [];
  createObservation = vi.fn(async (_actor: Actor, input: LocationObservationInput) => observation({ ...input, id: crypto.randomUUID(), entityType: GraphEntityType.Person, entityLabel: "Arjun Mehta", context: input.context ?? null, accuracyMeters: input.accuracyMeters ?? null, sourceEvidenceId: input.sourceEvidenceId ?? null }));
  async listObservations(actor: Actor, query: GeographicObservationQuery) { void actor; void query; return this.observations; }
  async findNearestTemporalObservation(_actor: Actor, entityId: string, timestamp: Date, allowedWindowMinutes: number) {
    return resolveLocationFromObservations(this.observations, entityId, timestamp, allowedWindowMinutes).observation;
  }
  async listActivities(actor: Actor, query: GeographicActivityQuery) { void actor; void query; return this.activities; }
  async listFindings() { return this.findings; }
}

const graph: GraphNeighborhood = {
  focusEntity: { id: ids.arjun, entityType: GraphEntityType.Person, displayLabel: "Arjun Mehta", verificationState: VerificationState.Verified, canonicalRecord: { type: "PERSON", id: "40000000-0000-4000-8000-000000000001" } },
  nodes: [
    { id: ids.arjun, entityType: GraphEntityType.Person, displayLabel: "Arjun Mehta", verificationState: VerificationState.Verified, canonicalRecord: { type: "PERSON", id: "40000000-0000-4000-8000-000000000001" } },
    { id: ids.meera, entityType: GraphEntityType.Person, displayLabel: "Meera Nair", verificationState: VerificationState.Verified, canonicalRecord: { type: "PERSON", id: "40000000-0000-4000-8000-000000000002" } },
  ],
  edges: [{ id: ids.relationship, sourceId: ids.arjun, targetId: ids.meera, relationshipType: "COMMUNICATES_WITH", strength: RelationshipStrength.Primary, evidenceConfidence: EvidenceConfidence.Verified, verificationState: VerificationState.Verified, interactionCount: 16, interactionSummary: null, firstObservedAt: eventAt, latestObservedAt: eventAt }],
  activeFilters: { hops: 1, strengths: [RelationshipStrength.Primary], verificationStates: [VerificationState.Verified] },
  provenanceSummaries: [{ relationshipId: ids.relationship, sourceCount: 1, sourceCaseIds: [ids.case] }],
};

function activity(): GeographicActivityRecord {
  return { id: ids.communication, kind: "COMMUNICATION", recordNumber: "COM-108", subtype: "CALL", occurredAt: eventAt, sourceEntityId: ids.arjun, sourceLabel: "Arjun Mehta", destinationEntityId: ids.meera, destinationLabel: "Meera Nair", durationSeconds: 272, amount: null, currency: null, caseId: ids.case, caseFirNumber: "FIR-108", incidentId: null, sourceEvidenceId: ids.evidence, verificationLevel: IncidentVerificationLevel.DepartmentVerified };
}

describe("GeographyService", () => {
  it("resolves only temporal observations near the event and never substitutes residence", () => {
    const residence = observation({ id: "a0000000-0000-4000-8000-000000000002", observationType: LocationObservationType.Residence, observedAt: eventAt });
    const resolved = resolveLocationFromObservations([residence, observation()], ids.arjun, eventAt, 180);
    expect(resolved).toMatchObject({ status: "KNOWN", temporalDistanceSeconds: 60, observation: { observationType: LocationObservationType.ObservedPersonLocation } });
    expect(resolveLocationFromObservations([residence], ids.arjun, eventAt, 180)).toMatchObject({ status: "UNKNOWN", observation: null });
  });

  it("returns unknown instead of using an observation outside the bounded window", () => {
    const old = observation({ observedAt: new Date("2026-08-01T00:00:00.000Z") });
    expect(resolveLocationFromObservations([old], ids.arjun, eventAt, 180)).toMatchObject({ status: "UNKNOWN", temporalDistanceSeconds: null });
  });

  it("bundles a relationship and call while preserving both independently resolved endpoints", async () => {
    const repository = new MemoryRepository();
    repository.observations = [observation(), observation({ id: "a0000000-0000-4000-8000-000000000003", graphEntityId: ids.meera, entityLabel: "Meera Nair", latitude: 12.9352, longitude: 77.6245, observedAt: new Date("2026-08-16T20:46:00.000Z") })];
    repository.activities = [activity()];
    const service = new GeographyService(repository, vi.fn(async () => graph), vi.fn(async () => []));
    const projection = await service.getProjection(departmentUser, { focusEntityId: ids.arjun, hops: 1, strengths: [RelationshipStrength.Primary], verificationStates: [VerificationState.Verified], startTime: new Date("2026-08-16T00:00:00.000Z"), endTime: new Date("2026-08-17T00:00:00.000Z"), allowedLocationWindowMinutes: 180 });
    expect(projection.connections).toHaveLength(1);
    expect(projection.connections[0]).toMatchObject({ strength: RelationshipStrength.Primary, counts: { calls: 1, relationships: 1 }, sourceObservation: { locationLabel: "Location X" }, targetObservation: { entityLabel: "Meera Nair" } });
    expect(projection.connections[0]?.records.map((record) => record.kind)).toEqual(expect.arrayContaining(["COMMUNICATION", "RELATIONSHIP"]));
    expect(projection.summary.unknownEndpointCount).toBe(0);
  });

  it("keeps a partially geolocated call in details without fabricating the second endpoint", async () => {
    const repository = new MemoryRepository();
    repository.observations = [observation()];
    repository.activities = [activity()];
    const service = new GeographyService(repository, vi.fn(async () => graph), vi.fn(async () => []));
    const projection = await service.getProjection(departmentUser, { focusEntityId: ids.arjun, hops: 1, strengths: [RelationshipStrength.Primary], verificationStates: [VerificationState.Verified], startTime: new Date("2026-08-16T00:00:00.000Z"), endTime: new Date("2026-08-17T00:00:00.000Z"), allowedLocationWindowMinutes: 180 });
    expect(projection.activities[0]?.sourceLocation.status).toBe("KNOWN");
    expect(projection.activities[0]?.destinationLocation).toEqual(expect.objectContaining({ status: "UNKNOWN", observation: null }));
    expect(projection.summary.unknownEndpointCount).toBe(1);
  });

  it("allows only authorized roles to create validated observations", async () => {
    const repository = new MemoryRepository();
    const service = new GeographyService(repository, vi.fn(async () => graph), vi.fn(async () => []));
    const input: LocationObservationInput = { graphEntityId: ids.arjun, latitude: 12.9, longitude: 77.6, observedAt: eventAt, observationType: LocationObservationType.ObservedPersonLocation, locationLabel: "Authorized location", sourceRecordType: LocationSourceRecordType.Evidence, sourceRecordId: ids.evidence, verificationLevel: IncidentVerificationLevel.DepartmentVerified };
    await expect(service.createObservation(investigator, input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.createObservation(departmentUser, input)).resolves.toMatchObject({ graphEntityId: ids.arjun });
  });
});
