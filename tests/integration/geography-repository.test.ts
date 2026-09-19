// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedSyntheticDemoData } from "../../prisma/seed";
import type { Actor } from "@/domain/auth";
import {
  IncidentVerificationLevel,
  LocationObservationType,
  LocationSourceRecordType,
  RelationshipStrength,
  UserRole,
  VerificationState,
} from "@/domain/model";
import { prisma } from "@/server/db/client";
import { PrismaGeographyRepository } from "@/server/repositories/prisma-geography-repository";
import { GeographyService } from "@/server/services/geography-service";

const cyberActor: Actor = { userId: "20000000-0000-4000-8000-000000000002", email: "department@nexustrace.demo", displayName: "Dev Malhotra", role: UserRole.DepartmentUser, departmentId: "10000000-0000-4000-8000-000000000002" };
const financialActor: Actor = { userId: "20000000-0000-4000-8000-000000000003", email: "investigator@nexustrace.demo", displayName: "Ishaan Sen", role: UserRole.Investigator, departmentId: "10000000-0000-4000-8000-000000000003" };
const ids = { arjun: "60000000-0000-4000-8000-000000000001", residenceX: "60000000-0000-4000-8000-000000000013", evidence: "50000000-0000-4000-8000-000000000001" } as const;

describe("PrismaGeographyRepository", () => {
  const repository = new PrismaGeographyRepository();
  const service = new GeographyService(repository);
  const createdIds: string[] = [];

  beforeAll(async () => { await seedSyntheticDemoData(); });
  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { targetId: { in: createdIds } } });
    await prisma.entityLocationObservation.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.$disconnect();
  });

  it("persists an authorized timestamped observation and audits its provenance", async () => {
    const created = await service.createObservation(cyberActor, {
      graphEntityId: ids.arjun,
      latitude: 12.979,
      longitude: 77.641,
      observedAt: new Date("2026-08-16T20:43:00.000Z"),
      observationType: LocationObservationType.ObservedPersonLocation,
      locationLabel: "Integration-test authorized location",
      context: "Synthetic integration test",
      accuracyMeters: 30,
      sourceRecordType: LocationSourceRecordType.Evidence,
      sourceRecordId: ids.evidence,
      sourceEvidenceId: ids.evidence,
      verificationLevel: IncidentVerificationLevel.DepartmentVerified,
    });
    createdIds.push(created.id);
    expect(created).toMatchObject({ graphEntityId: ids.arjun, longitude: 77.641, verificationLevel: IncidentVerificationLevel.DepartmentVerified });
    await expect(prisma.auditEvent.findFirst({ where: { targetId: created.id, action: "LOCATION_OBSERVATION_CREATE" } })).resolves.toMatchObject({ actorId: cyberActor.userId, outcome: "SUCCESS" });
  });

  it("resolves the nearest temporal observation but never substitutes a residence", async () => {
    const callTime = new Date("2026-08-16T20:45:00.000Z");
    const person = await service.resolveEntityLocationAtTime(cyberActor, ids.arjun, callTime, 180);
    const residence = await service.resolveEntityLocationAtTime(cyberActor, ids.residenceX, callTime, 180);
    expect(person).toMatchObject({ status: "KNOWN", observation: { observationType: LocationObservationType.ObservedPersonLocation } });
    expect(residence).toEqual(expect.objectContaining({ status: "UNKNOWN", observation: null }));
  });

  it("returns the COM-108 call with two independently authorized endpoint locations", async () => {
    const projection = await service.getProjection(cyberActor, {
      focusEntityId: ids.arjun,
      hops: 1,
      strengths: [RelationshipStrength.Primary],
      verificationStates: [VerificationState.Verified],
      startTime: new Date("2026-08-16T20:40:00.000Z"),
      endTime: new Date("2026-08-16T20:50:00.000Z"),
      allowedLocationWindowMinutes: 180,
    });
    const call = projection.activities.find((item) => item.recordNumber === "COM-108");
    expect(call).toMatchObject({ durationSeconds: 272, sourceLocation: { status: "KNOWN" }, destinationLocation: { status: "KNOWN" }, caseFirNumber: "FIR-108" });
    expect(projection.connections.find((item) => item.sourceEntityId === ids.arjun || item.targetEntityId === ids.arjun)?.counts.calls).toBeGreaterThan(0);
  });

  it("returns no coordinates or counts from another department's scope", async () => {
    await expect(repository.listObservations(financialActor, { entityIds: [ids.arjun] })).resolves.toEqual([]);
    await expect(repository.findNearestTemporalObservation(financialActor, ids.arjun, new Date("2026-08-16T20:45:00.000Z"), 180)).resolves.toBeNull();
    await expect(service.getProjection(financialActor, { focusEntityId: ids.arjun, hops: 1, strengths: [RelationshipStrength.Primary], verificationStates: [VerificationState.Verified], allowedLocationWindowMinutes: 180 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
