// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedSyntheticDemoData } from "../../prisma/seed";
import type { Actor } from "@/domain/auth";
import { IncidentParticipation, IncidentSubmissionStatus, IncidentType, IncidentVerificationLevel, UserRole } from "@/domain/model";
import { prisma } from "@/server/db/client";
import { PrismaIncidentRepository } from "@/server/repositories/prisma-incident-repository";

const ids = {
  cyberDepartment: "10000000-0000-4000-8000-000000000002",
  financialDepartment: "10000000-0000-4000-8000-000000000003",
  administrator: "20000000-0000-4000-8000-000000000001",
  departmentUser: "20000000-0000-4000-8000-000000000002",
  investigator: "20000000-0000-4000-8000-000000000003",
  cyberCase: "30000000-0000-4000-8000-000000000001",
  financialCase: "30000000-0000-4000-8000-000000000002",
  arjun: "40000000-0000-4000-8000-000000000001",
  kabir: "40000000-0000-4000-8000-000000000003",
  callEvidence: "50000000-0000-4000-8000-000000000001",
  ledgerEvidence: "50000000-0000-4000-8000-000000000002",
} as const;
const cyberActor: Actor = { userId: ids.departmentUser, email: "department@nexustrace.demo", displayName: "Dev Malhotra", role: UserRole.DepartmentUser, departmentId: ids.cyberDepartment };
const investigator: Actor = { userId: ids.investigator, email: "investigator@nexustrace.demo", displayName: "Ishaan Sen", role: UserRole.Investigator, departmentId: ids.financialDepartment };
const administrator: Actor = { userId: ids.administrator, email: "admin@nexustrace.demo", displayName: "Aditi Rao", role: UserRole.Administrator, departmentId: "10000000-0000-4000-8000-000000000001" };

describe("PrismaIncidentRepository", () => {
  const repository = new PrismaIncidentRepository();
  const createdIds: string[] = [];

  beforeAll(async () => { await seedSyntheticDemoData(); });
  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { targetId: { in: createdIds } } });
    await prisma.incident.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.$disconnect();
  });

  it("persists an investigator observation as pending, linked only to authorized canonical records", async () => {
    const incident = await repository.create(investigator, {
      incidentNumber: "TEST-INC-INVESTIGATOR", incidentType: IncidentType.SuspiciousEvent, title: "Synthetic investigator observation", description: "A synthetic observation kept pending for department review.", occurredAt: new Date("2026-08-18T15:20:00.000Z"), location: "Synthetic Mumbai location", caseId: ids.financialCase,
      people: [{ personId: ids.kabir, participation: IncidentParticipation.Witness }], evidenceIds: [ids.ledgerEvidence],
    }, "SUBMISSION");
    createdIds.push(incident.id);
    expect(incident).toMatchObject({ submissionStatus: IncidentSubmissionStatus.PendingReview, verificationLevel: IncidentVerificationLevel.Unverified, caseId: ids.financialCase });
    expect(incident.people).toHaveLength(1);
    expect(incident.evidence[0]?.evidenceId).toBe(ids.ledgerEvidence);
    expect(await repository.findForActor(cyberActor, incident.id)).toBeNull();
  });

  it("keeps department review scoped and supports department then cross verification with audit provenance", async () => {
    const incident = await repository.create(cyberActor, {
      incidentNumber: "TEST-INC-CYBER", incidentType: IncidentType.Meeting, title: "Synthetic cyber incident", description: "A synthetic incident with evidence for review lifecycle testing.", occurredAt: new Date("2026-08-16T12:05:00.000Z"), location: "Synthetic Bengaluru location", caseId: ids.cyberCase,
      people: [{ personId: ids.arjun, participation: IncidentParticipation.Suspect }], evidenceIds: [ids.callEvidence],
    }, "CANONICAL");
    createdIds.push(incident.id);
    expect(incident.verificationLevel).toBe(IncidentVerificationLevel.DepartmentVerified);
    const cross = await repository.verify(administrator, incident.id, IncidentVerificationLevel.CrossVerified, "Synthetic cross-department review.");
    expect(cross).toMatchObject({ verificationLevel: IncidentVerificationLevel.CrossVerified, crossVerifierName: "Aditi Rao" });
    expect(await prisma.auditEvent.findFirst({ where: { targetId: incident.id, action: "INCIDENT_CROSS_VERIFIED" } })).toMatchObject({ actorId: ids.administrator, outcome: "SUCCESS" });
  });

  it("derives person, case, and incident timelines in descending order without duplicating records", async () => {
    const personTimeline = await repository.timelineForActor(cyberActor, { personId: ids.arjun, types: ["ALL"] });
    const caseTimeline = await repository.timelineForActor(cyberActor, { caseId: ids.cyberCase, types: ["ALL"] });
    const incidentTimeline = await repository.timelineForActor(cyberActor, { incidentId: "80000000-0000-4000-8000-000000000001", types: ["ALL"], startTime: new Date("2026-08-10T00:00:00.000Z"), endTime: new Date("2026-08-20T00:00:00.000Z") });
    expect(personTimeline?.some((item) => item.type === "INCIDENT")).toBe(true);
    expect(caseTimeline?.some((item) => item.type === "EVIDENCE")).toBe(true);
    expect(incidentTimeline?.every((item) => item.timestamp >= new Date("2026-08-10T00:00:00.000Z") && item.timestamp <= new Date("2026-08-20T00:00:00.000Z"))).toBe(true);
    expect(personTimeline?.map((item) => item.timestamp.getTime())).toEqual([...personTimeline ?? []].map((item) => item.timestamp.getTime()).sort((left, right) => right - left));
  });
});
