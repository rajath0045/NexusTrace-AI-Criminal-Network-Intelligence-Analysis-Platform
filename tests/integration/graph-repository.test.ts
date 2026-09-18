// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedSyntheticDemoData } from "../../prisma/seed";
import type { Actor } from "@/domain/auth";
import type { RelationshipInput } from "@/domain/graph";
import {
  EvidenceConfidence,
  RelationshipStrength,
  UserRole,
  VerificationState,
} from "@/domain/model";
import { prisma } from "@/server/db/client";
import { PrismaGraphRepository } from "@/server/graph/prisma-graph-repository";

const cyberActor: Actor = {
  userId: "20000000-0000-4000-8000-000000000002",
  email: "department@nexustrace.demo",
  displayName: "Dev Malhotra",
  role: UserRole.DepartmentUser,
  departmentId: "10000000-0000-4000-8000-000000000002",
};

const financialActor: Actor = {
  userId: "20000000-0000-4000-8000-000000000003",
  email: "investigator@nexustrace.demo",
  displayName: "Ishaan Sen",
  role: UserRole.Investigator,
  departmentId: "10000000-0000-4000-8000-000000000003",
};

const administratorActor: Actor = {
  userId: "20000000-0000-4000-8000-000000000001",
  email: "admin@nexustrace.demo",
  displayName: "Aditi Rao",
  role: UserRole.Administrator,
  departmentId: "10000000-0000-4000-8000-000000000001",
};

const ids = {
  arjun: "60000000-0000-4000-8000-000000000001",
  meera: "60000000-0000-4000-8000-000000000002",
  kabir: "60000000-0000-4000-8000-000000000003",
  phone: "60000000-0000-4000-8000-000000000007",
  vehicle: "60000000-0000-4000-8000-000000000009",
  device: "60000000-0000-4000-8000-000000000010",
  location: "60000000-0000-4000-8000-000000000011",
  callEvidence: "50000000-0000-4000-8000-000000000001",
  cyberCase: "30000000-0000-4000-8000-000000000001",
  usesPhone: "70000000-0000-4000-8000-000000000001",
  controlsAccount: "70000000-0000-4000-8000-000000000002",
} as const;

function testInput(relationshipType: string): RelationshipInput {
  return {
    sourceEntityId: ids.meera,
    targetEntityId: ids.vehicle,
    relationshipType,
    strength: RelationshipStrength.Secondary,
    evidenceConfidence: EvidenceConfidence.Probable,
    interactionCount: 1,
    interactionSummary: "Synthetic Task 7 integration relationship.",
    sources: [{
      evidenceId: ids.callEvidence,
      sourceCaseId: ids.cyberCase,
      note: "Synthetic Task 7 provenance.",
    }],
  };
}

describe("PrismaGraphRepository", () => {
  const repository = new PrismaGraphRepository();

  beforeAll(async () => {
    await seedSyntheticDemoData();
    const old = await prisma.graphRelationship.findMany({
      where: { relationshipType: { startsWith: "TEST_TASK7_" } },
      select: { id: true },
    });
    await prisma.auditEvent.deleteMany({ where: { targetId: { in: old.map((item) => item.id) } } });
    await prisma.graphRelationship.deleteMany({ where: { id: { in: old.map((item) => item.id) } } });
  });

  afterAll(async () => {
    const created = await prisma.graphRelationship.findMany({
      where: { relationshipType: { startsWith: "TEST_TASK7_" } },
      select: { id: true },
    });
    await prisma.auditEvent.deleteMany({ where: { targetId: { in: created.map((item) => item.id) } } });
    await prisma.graphRelationship.deleteMany({ where: { id: { in: created.map((item) => item.id) } } });
    await prisma.$disconnect();
  });

  it("retrieves entities only inside the actor's department scope", async () => {
    expect((await repository.findEntityForActor(cyberActor, ids.arjun))?.displayLabel).toBe("Arjun Mehta");
    expect(await repository.findEntityForActor(cyberActor, ids.kabir)).toBeNull();
    expect((await repository.findEntityForActor(administratorActor, ids.kabir))?.displayLabel).toBe("Kabir Shah");
  });

  it.each([
    [RelationshipStrength.Primary, ids.arjun, ids.phone],
    [RelationshipStrength.Secondary, ids.arjun, ids.vehicle],
    [RelationshipStrength.Tertiary, ids.vehicle, ids.location],
  ])("filters authorized one-hop traversal by %s strength", async (strength, rootId, expectedTarget) => {
    const graph = await repository.getNeighborhood(cyberActor, rootId, {
      hops: 1,
      strengths: [strength],
      verificationStates: [VerificationState.Verified],
    });

    expect(graph?.edges).toHaveLength(1);
    expect(graph?.nodes.map((node) => node.id)).toContain(expectedTarget);
    expect(graph?.edges[0]?.strength).toBe(strength);
  });

  it("filters pending intelligence independently from relationship strength", async () => {
    const graph = await repository.getNeighborhood(cyberActor, ids.arjun, {
      hops: 1,
      strengths: [RelationshipStrength.Primary],
      verificationStates: [VerificationState.Pending],
    });

    expect(graph?.edges.map((edge) => edge.targetId)).toEqual([ids.device]);
    expect(graph?.edges[0]?.verificationState).toBe(VerificationState.Pending);
  });

  it("supports authorized bounded two-hop traversal without duplicate edges", async () => {
    const graph = await repository.getNeighborhood(cyberActor, ids.arjun, {
      hops: 2,
      strengths: [RelationshipStrength.Secondary, RelationshipStrength.Tertiary],
      verificationStates: [VerificationState.Verified],
    });

    expect(graph?.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([ids.arjun, ids.vehicle, ids.location]));
    expect(new Set(graph?.edges.map((edge) => edge.id)).size).toBe(graph?.edges.length);
  });

  it("returns connection details with evidence and originating-case provenance", async () => {
    const detail = await repository.findRelationshipForActor(cyberActor, ids.usesPhone);

    expect(detail).toMatchObject({
      relationshipType: "USES",
      sourceEntity: { displayLabel: "Arjun Mehta" },
      verifiedByName: "Aditi Rao",
    });
    expect(detail?.provenance[0]).toMatchObject({
      evidenceFilename: "synthetic-call-summary.csv",
      sourceFirNumber: "FIR-108",
    });
  });

  it("returns no nodes, edges, details, or counts for restricted graph data", async () => {
    expect(await repository.getNeighborhood(financialActor, ids.arjun, {
      hops: 1,
      strengths: [RelationshipStrength.Primary],
      verificationStates: [VerificationState.Verified],
    })).toBeNull();
    expect(await repository.findRelationshipForActor(cyberActor, ids.controlsAccount)).toBeNull();
  });

  it("allows an Administrator to verify an evidence-backed proposal and audits the review", async () => {
    const proposed = await repository.createRelationship(cyberActor, testInput("TEST_TASK7_REVIEW"), {
      verificationState: VerificationState.Pending,
      verifiedById: null,
      verifiedAt: null,
      auditAction: "RELATIONSHIP_PROPOSE",
    });
    const verified = await repository.reviewRelationship(administratorActor, proposed.id, {
      decision: VerificationState.Verified,
    });
    const audit = await prisma.auditEvent.findFirst({
      where: { action: "RELATIONSHIP_VERIFIED", targetId: proposed.id },
    });

    expect(verified).toMatchObject({ verificationState: VerificationState.Verified, verifiedByName: "Aditi Rao" });
    expect(verified?.verifiedAt).toBeInstanceOf(Date);
    expect(audit).toMatchObject({ actorId: administratorActor.userId, outcome: "SUCCESS" });
  });

  it("rejects duplicate edges and rolls back the failed audit transaction", async () => {
    const input = testInput("TEST_TASK7_DUPLICATE");
    const created = await repository.createRelationship(cyberActor, input, {
      verificationState: VerificationState.Pending,
      verifiedById: null,
      verifiedAt: null,
      auditAction: "RELATIONSHIP_PROPOSE",
    });

    await expect(repository.createRelationship(cyberActor, input, {
      verificationState: VerificationState.Pending,
      verifiedById: null,
      verifiedAt: null,
      auditAction: "RELATIONSHIP_PROPOSE",
    })).rejects.toMatchObject({ code: "CONFLICT" });

    expect(await prisma.auditEvent.count({ where: { targetId: created.id, action: "RELATIONSHIP_PROPOSE" } })).toBe(1);
  });

  it("rejects self edges and verified records without provenance", async () => {
    await expect(repository.createRelationship(cyberActor, {
      ...testInput("TEST_TASK7_SELF"),
      targetEntityId: ids.meera,
    }, {
      verificationState: VerificationState.Pending,
      verifiedById: null,
      verifiedAt: null,
      auditAction: "RELATIONSHIP_PROPOSE",
    })).rejects.toMatchObject({ code: "VALIDATION" });

    await expect(repository.createRelationship(administratorActor, {
      ...testInput("TEST_TASK7_NO_SOURCE"),
      sources: [],
    }, {
      verificationState: VerificationState.Verified,
      verifiedById: administratorActor.userId,
      verifiedAt: new Date(),
      auditAction: "RELATIONSHIP_CREATE_VERIFIED",
    })).rejects.toMatchObject({ code: "VALIDATION" });
  });
});
