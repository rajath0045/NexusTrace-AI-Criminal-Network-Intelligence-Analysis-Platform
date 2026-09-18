import { Prisma } from "@prisma/client";
import type { Actor } from "@/domain/auth";
import type { FindingQueueQuery, FindingReviewInput, InvestigationAnalysis, PersistedFindingView } from "@/domain/investigation";
import { FindingDispositionReason, FindingReviewStatus, IncidentVerificationLevel, UserRole } from "@/domain/model";
import { prisma } from "@/server/db/client";
import type { FindingRepository } from "./finding-repository";

const include = { person: { select: { id: true, givenName: true, familyName: true } }, incident: { select: { id: true, incidentNumber: true } }, case: { select: { id: true, firNumber: true } }, reviews: { include: { reviewer: { select: { displayName: true, role: true } }, reviewerDepartment: { select: { name: true } } }, orderBy: { createdAt: "desc" } } } satisfies Prisma.InvestigationFindingInclude;
type Record = Prisma.InvestigationFindingGetPayload<{ include: typeof include }>;
function scope(actor: Actor): Prisma.InvestigationFindingWhereInput { return actor.role === UserRole.Administrator ? {} : { departmentId: actor.departmentId }; }
function view(record: Record): PersistedFindingView {
  return { persistentId: record.id, findingKey: record.findingKey, id: record.findingKey.split(":").at(-1) ?? record.findingKey, category: record.category as PersistedFindingView["category"], title: record.title, detail: record.detail, status: "INVESTIGATIVE LEAD — HUMAN REVIEW REQUIRED", supportingRecordIds: record.supportingRecordIds as string[], evidence: (record.evidenceIds as Array<{ id: string; verificationLevel: IncidentVerificationLevel }>), verificationLevels: record.verificationLevels as IncidentVerificationLevel[], reviewStatus: record.reviewStatus as FindingReviewStatus, personId: record.personId, personName: `${record.person.givenName} ${record.person.familyName}`, incidentId: record.incidentId, incidentNumber: record.incident.incidentNumber, caseId: record.caseId, caseFirNumber: record.case?.firNumber ?? null, generatedAt: record.generatedAt, reviews: record.reviews.map((review) => ({ id: review.id, reviewerName: review.reviewer.displayName, reviewerRole: review.reviewer.role, reviewerDepartmentName: review.reviewerDepartment.name, previousStatus: review.previousStatus as FindingReviewStatus, status: review.status as FindingReviewStatus, reasonCode: review.reasonCode as FindingDispositionReason, note: review.note, createdAt: review.createdAt })) };
}
function key(analysis: InvestigationAnalysis, finding: InvestigationAnalysis["findings"][number]) { return `${analysis.person.id}:${analysis.incident.id}:${analysis.window.startTime.toISOString()}:${analysis.window.endTime.toISOString()}:${finding.category}:${finding.id}`; }
function json(value: unknown): Prisma.InputJsonValue { return value as Prisma.InputJsonValue; }

export class PrismaFindingRepository implements FindingRepository {
  async sync(actor: Actor, analysis: InvestigationAnalysis) {
    const result = new Map<string, { id: string; status: string }>();
    for (const finding of analysis.findings) {
      const findingKey = key(analysis, finding);
      const record = await prisma.investigationFinding.upsert({ where: { findingKey }, update: { title: finding.title, detail: finding.detail, supportingRecordIds: json(finding.supportingRecordIds), evidenceIds: json(finding.evidence), verificationLevels: json(finding.verificationLevels), generatedAt: new Date() }, create: { findingKey, category: finding.category, title: finding.title, detail: finding.detail, personId: analysis.person.id, incidentId: analysis.incident.id, departmentId: actor.role === UserRole.Administrator ? (await prisma.incident.findUniqueOrThrow({ where: { id: analysis.incident.id }, select: { departmentId: true } })).departmentId : actor.departmentId, windowStart: analysis.window.startTime, windowEnd: analysis.window.endTime, supportingRecordIds: json(finding.supportingRecordIds), evidenceIds: json(finding.evidence), verificationLevels: json(finding.verificationLevels) } });
      result.set(finding.id, { id: record.id, status: record.reviewStatus });
    }
    return result;
  }
  async list(actor: Actor, query: FindingQueueQuery) {
    const records = await prisma.investigationFinding.findMany({ where: { ...scope(actor), ...(query.status ? { reviewStatus: query.status } : {}), ...(query.category ? { category: query.category } : {}), ...(query.caseId ? { caseId: query.caseId } : {}), ...(query.incidentId ? { incidentId: query.incidentId } : {}), ...(query.personId ? { personId: query.personId } : {}), ...(query.startTime || query.endTime ? { generatedAt: { ...(query.startTime ? { gte: query.startTime } : {}), ...(query.endTime ? { lte: query.endTime } : {}) } } : {}) }, include, orderBy: [{ generatedAt: "desc" }, { id: "asc" }], take: 250 });
    return records.map(view);
  }
  async find(actor: Actor, findingId: string) { const record = await prisma.investigationFinding.findFirst({ where: { id: findingId, ...scope(actor) }, include }); return record ? view(record) : null; }
  async review(actor: Actor, findingId: string, input: FindingReviewInput) {
    const id = await prisma.$transaction(async (tx) => {
      const finding = await tx.investigationFinding.findFirst({ where: { id: findingId, ...scope(actor) }, select: { id: true, departmentId: true, incidentId: true, caseId: true, reviewStatus: true } });
      if (!finding) return null;
      await tx.investigationFinding.update({ where: { id: finding.id }, data: { reviewStatus: input.status } });
      await tx.findingReview.create({ data: { findingId: finding.id, reviewerUserId: actor.userId, reviewerDepartmentId: actor.departmentId, previousStatus: finding.reviewStatus, status: input.status, reasonCode: input.reasonCode, note: input.note ?? null } });
      await tx.auditEvent.create({ data: { actorId: actor.userId, departmentId: finding.departmentId, action: "FINDING_REVIEW", targetType: "INVESTIGATION_FINDING", targetId: finding.id, outcome: "SUCCESS", metadata: { previousStatus: finding.reviewStatus, status: input.status, reasonCode: input.reasonCode, incidentId: finding.incidentId, caseId: finding.caseId, reviewerRole: actor.role } } });
      return finding.id;
    });
    return id ? this.find(actor, id) : null;
  }
}
