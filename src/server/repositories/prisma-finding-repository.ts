import { Prisma } from "@prisma/client";
import type { Actor } from "@/domain/auth";
import type { FindingAnalysisSnapshot, FindingQueueQuery, FindingReviewInput, FindingSupportingRecord, InvestigationAnalysis, PersistedFindingView } from "@/domain/investigation";
import { NotFoundError } from "@/domain/errors";
import { FindingDispositionReason, FindingReviewStatus, IncidentVerificationLevel, UserRole } from "@/domain/model";
import { prisma } from "@/server/db/client";
import type { FindingRepository } from "./finding-repository";

const reviewInclude = { reviewer: { select: { displayName: true, role: true } }, reviewerDepartment: { select: { name: true } } } as const;
const include = {
  person: { select: { id: true, givenName: true, familyName: true } },
  incident: { select: { id: true, incidentNumber: true } },
  case: { select: { id: true, firNumber: true } },
  reviews: { include: reviewInclude, orderBy: [{ createdAt: "desc" }, { id: "desc" }] },
} satisfies Prisma.InvestigationFindingInclude;
type FindingRecord = Prisma.InvestigationFindingGetPayload<{ include: typeof include }>;
function departmentScope(actor: Actor) { return actor.role === UserRole.Administrator ? {} : { departmentId: actor.departmentId }; }
function scope(actor: Actor): Prisma.InvestigationFindingWhereInput {
  if (actor.role === UserRole.Administrator) return {};
  return { departmentId: actor.departmentId, incident: { departmentId: actor.departmentId },
    person: { cases: { some: { case: { departmentId: actor.departmentId } } } },
    OR: [{ caseId: null }, { case: { departmentId: actor.departmentId } }] };
}
function view(record: FindingRecord): PersistedFindingView {
  return {
    persistentId: record.id, findingKey: record.findingKey, id: record.id,
    category: record.category as PersistedFindingView["category"], title: record.title, detail: record.detail,
    status: "INVESTIGATIVE LEAD — HUMAN REVIEW REQUIRED",
    supportingRecordIds: record.supportingRecordIds as string[],
    evidence: record.evidenceIds as unknown as PersistedFindingView["evidence"],
    verificationLevels: record.verificationLevels as IncidentVerificationLevel[],
    reviewStatus: record.reviewStatus as FindingReviewStatus,
    personId: record.personId, personName: `${record.person.givenName} ${record.person.familyName}`,
    incidentId: record.incidentId, incidentNumber: record.incident.incidentNumber,
    caseId: record.caseId, caseFirNumber: record.case?.firNumber ?? null,
    windowStart: record.windowStart, windowEnd: record.windowEnd, generatedAt: record.generatedAt,
    snapshot: record.analysisSnapshot as unknown as FindingAnalysisSnapshot | null,
    reviews: record.reviews.map((review) => ({
      id: review.id, reviewerName: review.reviewer.displayName, reviewerRole: review.reviewer.role,
      reviewerDepartmentName: review.reviewerDepartment.name,
      previousStatus: review.previousStatus as FindingReviewStatus, status: review.status as FindingReviewStatus,
      reasonCode: review.reasonCode as FindingDispositionReason, note: review.note, createdAt: review.createdAt,
    })),
  };
}
function key(analysis: InvestigationAnalysis, finding: InvestigationAnalysis["findings"][number]) {
  return `${analysis.person.id}:${analysis.incident.id}:${analysis.window.startTime.toISOString()}:${analysis.window.endTime.toISOString()}:${finding.category}:${finding.id}`;
}
function json(value: unknown): Prisma.InputJsonValue { return value as Prisma.InputJsonValue; }

// Resolve JSON references against current permissions before emitting any IDs or counts.
async function present(actor: Actor, records: FindingRecord[], details = false): Promise<PersistedFindingView[]> {
  if (!records.length) return [];
  const views = records.map(view);
  const ids = [...new Set(views.flatMap((record) => record.supportingRecordIds))];
  const evidenceIds = [...new Set(views.flatMap((record) => record.evidence.map((entry) => entry.id)))];
  const department = departmentScope(actor);
  const endpointSelect = { displayLabel: true };
  const [communications, transactions, relationships, evidence] = await Promise.all([
    prisma.communicationRecord.findMany({
      where: { id: { in: ids }, ...department, sourceEntity: department, destinationEntity: department },
      include: { sourceEntity: { select: endpointSelect }, destinationEntity: { select: endpointSelect } },
    }),
    prisma.financialTransaction.findMany({
      where: { id: { in: ids }, ...department, sourceEntity: department, destinationEntity: department },
      include: { sourceEntity: { select: endpointSelect }, destinationEntity: { select: endpointSelect } },
    }),
    prisma.graphRelationship.findMany({
      where: { id: { in: ids }, ...department, sourceEntity: department, targetEntity: department },
      include: { sourceEntity: { select: endpointSelect }, targetEntity: { select: endpointSelect },
        evidence: { where: { evidence: department, sourceCase: department }, select: { evidenceId: true } } },
    }),
    prisma.evidence.findMany({ where: { id: { in: evidenceIds }, ...department, case: department },
      select: { id: true, originalFilename: true, verificationState: true } }),
  ]);
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  const sources: FindingSupportingRecord[] = [
    ...communications.map((item) => ({
      id: item.id, type: "COMMUNICATION" as const, label: item.communicationNumber,
      observedAt: item.occurredAt, verificationState: item.verificationLevel,
      description: `${item.communicationType} · ${item.sourceEntity.displayLabel} → ${item.destinationEntity.displayLabel} · ${item.direction} · ${item.durationSeconds ?? "—"} seconds`,
      sourceEvidenceIds: item.sourceEvidenceId && evidenceById.has(item.sourceEvidenceId) ? [item.sourceEvidenceId] : [],
    })),
    ...transactions.map((item) => ({
      id: item.id, type: "FINANCIAL" as const, label: item.transactionNumber,
      observedAt: item.occurredAt, verificationState: item.verificationLevel,
      description: `${item.transactionType} · ${item.amount.toFixed(2)} ${item.currency} · ${item.sourceEntity.displayLabel} → ${item.destinationEntity.displayLabel}`,
      sourceEvidenceIds: item.sourceEvidenceId && evidenceById.has(item.sourceEvidenceId) ? [item.sourceEvidenceId] : [],
    })),
    ...relationships.map((item) => ({
      id: item.id, type: "RELATIONSHIP" as const, label: item.relationshipType,
      observedAt: item.startsAt ?? item.endsAt, verificationState: item.verificationState,
      description: `${item.sourceEntity.displayLabel} → ${item.targetEntity.displayLabel} · ${item.strength} · ${item.evidenceConfidence} confidence · ${item.interactionCount} interactions`,
      sourceEvidenceIds: item.evidence.map((entry) => entry.evidenceId).filter((id) => evidenceById.has(id)),
      graphFocusId: item.sourceEntityId,
    })),
  ];
  const sourcesById = new Map(sources.map((item) => [item.id, item]));
  return views.map((record) => {
    const visibleIds = record.supportingRecordIds.filter((id) => sourcesById.has(id));
    const unavailable = visibleIds.length !== record.supportingRecordIds.length;
    return { ...record, supportingRecordIds: visibleIds,
      ...(unavailable ? { detail: "Some supporting sources are unavailable. Inspect the currently authorized sources.", snapshot: null } : {}),
      evidence: record.evidence.flatMap((entry) => {
        const source = evidenceById.get(entry.id);
        return source ? [{ ...entry, filename: source.originalFilename, sourceVerificationState: source.verificationState }] : [];
      }),
      ...(details ? { supportingRecords: visibleIds.map((id) => sourcesById.get(id)!) } : {}),
    };
  });
}

export class PrismaFindingRepository implements FindingRepository {
  async departments(actor: Actor) {
    return prisma.department.findMany({ where: actor.role === UserRole.Administrator ? {} : { id: actor.departmentId }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  }
  async sync(actor: Actor, analysis: InvestigationAnalysis) {
    const incident = await prisma.incident.findFirst({ where: { id: analysis.incident.id, ...departmentScope(actor) }, select: { departmentId: true, caseId: true } });
    if (!incident) throw new NotFoundError();
    const result = new Map<string, { id: string; status: string }>();
    for (const finding of analysis.findings) {
      const findingKey = key(analysis, finding);
      const metrics = finding.category === "COMMUNICATION" ? analysis.communicationMetrics
        : finding.category === "FINANCIAL" ? analysis.financialMetrics
          : finding.category === "NETWORK" ? analysis.networkMetrics : analysis.crossCaseMetrics;
      const snapshot: FindingAnalysisSnapshot = { capturedAt: new Date().toISOString(),
        baselineStartTime: analysis.window.baselineStartTime.toISOString(), baselineEndTime: analysis.window.baselineEndTime.toISOString(),
        metrics, comparison: finding.comparison ?? null };
      const data = { title: finding.title, detail: finding.detail, caseId: incident.caseId,
        supportingRecordIds: json(finding.supportingRecordIds), evidenceIds: json(finding.evidence),
        verificationLevels: json(finding.verificationLevels), analysisSnapshot: json(snapshot) };
      const existing = await prisma.investigationFinding.findUnique({ where: { findingKey }, select: { reviewStatus: true } });
      const record = await prisma.investigationFinding.upsert({
        where: { findingKey },
        update: existing?.reviewStatus === FindingReviewStatus.Unreviewed ? data : { caseId: incident.caseId },
        create: { ...data, findingKey, category: finding.category, personId: analysis.person.id,
          incidentId: analysis.incident.id, departmentId: incident.departmentId,
          windowStart: analysis.window.startTime, windowEnd: analysis.window.endTime },
      });
      result.set(finding.id, { id: record.id, status: record.reviewStatus });
    }
    return result;
  }

  async list(actor: Actor, query: FindingQueueQuery) {
    const where: Prisma.InvestigationFindingWhereInput = { AND: [
      scope(actor),
      ...(query.departmentId ? [{ departmentId: query.departmentId }] : []),
      ...(query.status ? [{ reviewStatus: query.status }] : []),
      ...(query.category ? [{ category: query.category }] : []),
      ...(query.caseId ? [{ caseId: query.caseId }] : []),
      ...(query.caseFirNumber ? [{ case: { firNumber: { equals: query.caseFirNumber, mode: "insensitive" as const } } }] : []),
      ...(query.incidentId ? [{ incidentId: query.incidentId }] : []),
      ...(query.personId ? [{ personId: query.personId }] : []),
      ...(query.verificationLevel ? [{ verificationLevels: { array_contains: [query.verificationLevel] } }] : []),
      ...(query.startTime || query.endTime ? [{ generatedAt: {
        ...(query.startTime ? { gte: query.startTime } : {}), ...(query.endTime ? { lte: query.endTime } : {}),
      } }] : []),
    ] };
    // An inaccessible cursor behaves exactly like a missing cursor record.
    const anchor = query.cursor ? await prisma.investigationFinding.findFirst({ where: { AND: [where, { id: query.cursor }] }, select: { id: true, generatedAt: true } }) : null;
    if (query.cursor && !anchor) return { items: [], nextCursor: null };
    const records = await prisma.investigationFinding.findMany({
      where: { AND: [where, ...(anchor ? [{ OR: [{ generatedAt: { lt: anchor.generatedAt } }, { generatedAt: anchor.generatedAt, id: { gt: anchor.id } }] }] : [])] },
      include: { ...include, reviews: { ...include.reviews, take: 1 } },
      orderBy: [{ generatedAt: "desc" }, { id: "asc" }], take: query.limit + 1,
    });
    const items = records.slice(0, query.limit);
    return { items: await present(actor, items), nextCursor: records.length > query.limit ? items.at(-1)?.id ?? null : null };
  }

  async find(actor: Actor, findingId: string) {
    const record = await prisma.investigationFinding.findFirst({ where: { AND: [scope(actor), { id: findingId }] }, include });
    return record ? (await present(actor, [record], true))[0] : null;
  }

  async review(actor: Actor, findingId: string, input: FindingReviewInput) {
    const id = await prisma.$transaction(async (tx) => {
      const authorized = await tx.investigationFinding.findFirst({ where: { AND: [scope(actor), { id: findingId }] }, select: { id: true } });
      if (!authorized) return null;
      // Serialize review transitions so immutable history records the actual previous state.
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "InvestigationFinding" WHERE id = ${findingId}::uuid FOR UPDATE`);
      const finding = await tx.investigationFinding.findUniqueOrThrow({ where: { id: findingId } });
      await tx.investigationFinding.update({ where: { id: finding.id }, data: { reviewStatus: input.status } });
      await tx.findingReview.create({ data: { findingId: finding.id, reviewerUserId: actor.userId,
        reviewerDepartmentId: actor.departmentId, previousStatus: finding.reviewStatus, status: input.status,
        reasonCode: input.reasonCode, note: input.note ?? null } });
      await tx.auditEvent.create({ data: { actorId: actor.userId, departmentId: finding.departmentId,
        action: "FINDING_REVIEW", targetType: "INVESTIGATION_FINDING", targetId: finding.id, outcome: "SUCCESS",
        metadata: { previousStatus: finding.reviewStatus, status: input.status, reasonCode: input.reasonCode,
          incidentId: finding.incidentId, caseId: finding.caseId, reviewerRole: actor.role } } });
      return finding.id;
    });
    return id ? this.find(actor, id) : null;
  }

  async metrics(actor: Actor) {
    const where = scope(actor);
    const groups = await prisma.investigationFinding.groupBy({ by: ["reviewStatus", "category"], where, _count: { _all: true } });
    const count = (status: string) => groups.filter((group) => group.reviewStatus === status).reduce((sum, group) => sum + group._count._all, 0);
    const total = groups.reduce((sum, group) => sum + group._count._all, 0);
    const authorized = actor.role === UserRole.Administrator ? Prisma.sql`TRUE` : Prisma.sql`
      f."departmentId" = ${actor.departmentId}::uuid
      AND EXISTS (SELECT 1 FROM "Incident" i WHERE i.id = f."incidentId" AND i."departmentId" = ${actor.departmentId}::uuid)
      AND (f."caseId" IS NULL OR EXISTS (SELECT 1 FROM "Case" c WHERE c.id = f."caseId" AND c."departmentId" = ${actor.departmentId}::uuid))
      AND EXISTS (SELECT 1 FROM "CasePerson" cp JOIN "Case" c ON c.id = cp."caseId"
        WHERE cp."personId" = f."personId" AND c."departmentId" = ${actor.departmentId}::uuid)`;
    const [timing, falsePositives, trends] = await Promise.all([
      prisma.$queryRaw<Array<{ average: number | null; median: number | null }>>(Prisma.sql`
        WITH first_review AS (
          SELECT EXTRACT(EPOCH FROM (MIN(r."createdAt") - f."generatedAt")) / 3600.0 AS hours
          FROM "InvestigationFinding" f JOIN "FindingReview" r ON r."findingId" = f.id
          WHERE ${authorized} GROUP BY f.id
        ) SELECT AVG(hours)::float8 AS average, percentile_cont(0.5) WITHIN GROUP (ORDER BY hours)::float8 AS median
          FROM first_review WHERE hours >= 0`),
      prisma.findingReview.count({ where: { finding: where, reasonCode: "FALSE_POSITIVE", status: "DISMISSED" } }),
      prisma.$queryRaw<Array<{ date: string; status: string; count: number }>>(Prisma.sql`
        SELECT to_char(r."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date, r.status::text AS status, count(*)::int AS count
        FROM "FindingReview" r JOIN "InvestigationFinding" f ON f.id = r."findingId"
        WHERE ${authorized} AND r."createdAt" >= CURRENT_TIMESTAMP - INTERVAL '30 days'
        GROUP BY date, r.status ORDER BY date, r.status`),
    ]);
    const rounded = (value: number | null | undefined) => value == null ? null : Number(value.toFixed(2));
    const types = new Map<string, number>();
    for (const group of groups) types.set(group.category, (types.get(group.category) ?? 0) + group._count._all);
    return { total, reviewed: total - count("UNREVIEWED"), unreviewed: count("UNREVIEWED"),
      acknowledged: count("ACKNOWLEDGED"), dismissed: count("DISMISSED"), falsePositive: falsePositives,
      needsMoreEvidence: count("NEEDS_MORE_EVIDENCE"), escalated: count("ESCALATED"),
      averageTurnaroundHours: rounded(timing[0]?.average), medianTurnaroundHours: rounded(timing[0]?.median),
      byType: [...types].map(([category, count]) => ({ category, count })), dispositionTrend: trends };
  }
}
