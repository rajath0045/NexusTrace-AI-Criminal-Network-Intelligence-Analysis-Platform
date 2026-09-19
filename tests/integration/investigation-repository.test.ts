// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedSyntheticDemoData } from "../../prisma/seed";
import type { Actor } from "@/domain/auth";
import { FindingDispositionReason, FindingReviewStatus, UserRole } from "@/domain/model";
import { buildDeterministicAnalysis } from "@/server/investigation/deterministic-analysis";
import { PrismaInvestigationRepository } from "@/server/repositories/prisma-investigation-repository";
import { PrismaFindingRepository } from "@/server/repositories/prisma-finding-repository";
import { InvestigationService } from "@/server/services/investigation-service";
import { prisma } from "@/server/db/client";

const actor: Actor = { userId: "20000000-0000-4000-8000-000000000002", email: "department@nexustrace.demo", displayName: "Dev Malhotra", role: UserRole.DepartmentUser, departmentId: "10000000-0000-4000-8000-000000000002" };

describe("PrismaInvestigationRepository", () => {
  beforeAll(async () => { await seedSyntheticDemoData(); });
  afterAll(async () => { await prisma.$disconnect(); });

  it("returns only authorized bounded activity and derives synthetic change leads from persisted records", async () => {
    const context = await new PrismaInvestigationRepository().contextForActor(actor, { personId: "40000000-0000-4000-8000-000000000001", incidentId: "80000000-0000-4000-8000-000000000001", beforeDays: 7, afterDays: 2 });
    expect(context?.activities.every((record) => record.occurredAt >= new Date("2026-08-02") && record.occurredAt <= new Date("2026-08-18T12:00:00.000Z"))).toBe(true);
    const analysis = buildDeterministicAnalysis(context!, 7, 2);
    expect(analysis.findings.map((finding) => finding.id)).toEqual(expect.arrayContaining(["communication-spike", "new-contact", "cross-case:Synthetic handset D-108"]));
    expect(analysis.findings.every((finding) => finding.status === "INVESTIGATIVE LEAD — HUMAN REVIEW REQUIRED")).toBe(true);
  });

  it("does not reveal a cyber incident context to an investigator scoped to financial intelligence", async () => {
    const financialActor = { ...actor, userId: "20000000-0000-4000-8000-000000000003", role: UserRole.Investigator, departmentId: "10000000-0000-4000-8000-000000000003" };
    await expect(new PrismaInvestigationRepository().contextForActor(financialActor, { personId: "40000000-0000-4000-8000-000000000001", incidentId: "80000000-0000-4000-8000-000000000001", beforeDays: 7, afterDays: 2 })).resolves.toBeNull();
  });

  it("persists, filters, paginates, and rehydrates only authorized finding support", async () => {
    const investigation = new PrismaInvestigationRepository();
    const context = await investigation.contextForActor(actor, { personId: "40000000-0000-4000-8000-000000000001", incidentId: "80000000-0000-4000-8000-000000000001", beforeDays: 7, afterDays: 2 });
    const analysis = buildDeterministicAnalysis(context!, 7, 2);
    const findings = new PrismaFindingRepository();
    await findings.sync(actor, analysis);
    const page = await findings.list(actor, { category: "COMMUNICATION", limit: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.category).toBe("COMMUNICATION");
    expect(page.items[0]?.windowStart).toEqual(analysis.window.startTime);
    expect(page.items[0]?.caseId).toBe("30000000-0000-4000-8000-000000000001");
    expect(page.items[0]?.caseFirNumber).toBe("FIR-108");
    expect(page.items[0]?.snapshot?.metrics.length).toBeGreaterThan(0);
    const firstGeneratedAt = page.items[0]!.generatedAt;
    const firstSnapshot = page.items[0]!.snapshot;
    const detail = await findings.find(actor, page.items[0]!.persistentId);
    const initialReviewCount = detail?.reviews.length ?? 0;
    expect(detail?.supportingRecords?.every((record) => record.type === "COMMUNICATION" || record.type === "FINANCIAL" || record.type === "RELATIONSHIP")).toBe(true);
    expect((await findings.list(actor, { caseId: page.items[0]!.caseId!, limit: 25 })).items.length).toBeGreaterThan(0);
    await findings.review(actor, page.items[0]!.persistentId, { status: FindingReviewStatus.Acknowledged, reasonCode: FindingDispositionReason.RelevantToCase, note: "Synthetic integration review." });
    await findings.sync(actor, analysis);
    const afterReanalysis = await findings.find(actor, page.items[0]!.persistentId);
    expect(afterReanalysis?.generatedAt).toEqual(firstGeneratedAt);
    expect(afterReanalysis?.snapshot).toEqual(firstSnapshot);
    expect(afterReanalysis?.reviewStatus).toBe(FindingReviewStatus.Acknowledged);
    expect(afterReanalysis?.reviews).toHaveLength(initialReviewCount + 1);
    const metrics = await findings.metrics(actor);
    expect(metrics.reviewed).toBeGreaterThan(0);
    expect(metrics.averageTurnaroundHours).not.toBeNull();
    const financialActor = { ...actor, userId: "20000000-0000-4000-8000-000000000003", role: UserRole.Investigator, departmentId: "10000000-0000-4000-8000-000000000003" };
    await expect(findings.list(financialActor, { limit: 25 })).resolves.toEqual({ items: [], nextCursor: null });
    await expect(findings.find(financialActor, page.items[0]!.persistentId)).resolves.toBeNull();
    await expect(findings.list(financialActor, { cursor: page.items[0]!.persistentId, limit: 25 })).resolves.toEqual({ items: [], nextCursor: null });
  });

  it("answers selected-finding review questions without mutating review history", async () => {
    const findings = new PrismaFindingRepository();
    const page = await findings.list(actor, { limit: 1 });
    const selected = page.items[0]!;
    const before = (await findings.find(actor, selected.persistentId))!.reviews.length;
    const service = new InvestigationService(new PrismaInvestigationRepository(), findings);
    const answer = await service.answer(actor, { personId: selected.personId, incidentId: selected.incidentId, beforeDays: 7, afterDays: 2, findingId: selected.persistentId, question: "Show review history for this finding." });
    expect(answer.notice).toBe("INVESTIGATIVE LEAD — HUMAN REVIEW REQUIRED");
    expect(answer.answer).toContain("Current human review state");
    expect((await findings.find(actor, selected.persistentId))!.reviews).toHaveLength(before);
    const financialActor = { ...actor, userId: "20000000-0000-4000-8000-000000000003", role: UserRole.Investigator, departmentId: "10000000-0000-4000-8000-000000000003" };
    await expect(service.answer(financialActor, { personId: selected.personId, incidentId: selected.incidentId, beforeDays: 7, afterDays: 2, findingId: selected.persistentId, question: "Which records support this finding?" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
