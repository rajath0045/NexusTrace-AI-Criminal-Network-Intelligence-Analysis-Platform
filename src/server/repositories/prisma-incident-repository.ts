import { Prisma } from "@prisma/client";
import type { Actor } from "@/domain/auth";
import { ConflictError, NotFoundError, ValidationError } from "@/domain/errors";
import type {
  IncidentAuditView,
  IncidentDetail,
  IncidentInput,
  IncidentReview,
  IncidentSummary,
  IncidentUpdate,
  TimelineItem,
  TimelineQuery,
} from "@/domain/incident";
import {
  GraphEntityType,
  IncidentParticipation,
  IncidentStatus,
  IncidentSubmissionStatus,
  IncidentType,
  IncidentVerificationLevel,
  UserRole,
  VerificationState,
} from "@/domain/model";
import { prisma } from "@/server/db/client";
import type { IncidentRepository } from "./incident-repository";

const incidentInclude = {
  department: { select: { name: true } },
  case: { select: { id: true, firNumber: true } },
  submittedBy: { select: { displayName: true } },
  departmentVerifiedBy: { select: { displayName: true } },
  crossVerifiedBy: { select: { displayName: true } },
  graphEntity: { select: { id: true } },
  people: {
    include: {
      person: { select: { id: true, givenName: true, familyName: true } },
      graphEntity: { select: { id: true, displayLabel: true } },
    },
    orderBy: { createdAt: "asc" },
  },
  evidence: {
    include: { evidence: { select: { id: true, originalFilename: true, verificationState: true } } },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.IncidentInclude;

type IncidentRecord = Prisma.IncidentGetPayload<{ include: typeof incidentInclude }>;

function scope(actor: Actor): Prisma.IncidentWhereInput {
  return actor.role === UserRole.Administrator ? {} : { departmentId: actor.departmentId };
}

function personName(person: { givenName: string; familyName: string }) {
  return `${person.givenName} ${person.familyName}`;
}

function toSummary(record: IncidentRecord): IncidentSummary {
  return {
    id: record.id,
    incidentNumber: record.incidentNumber,
    incidentType: record.incidentType as IncidentType,
    title: record.title,
    occurredAt: record.occurredAt,
    status: record.status as IncidentStatus,
    submissionStatus: record.submissionStatus as IncidentSubmissionStatus,
    verificationLevel: record.verificationLevel as IncidentVerificationLevel,
    departmentName: record.department.name,
    caseId: record.case?.id ?? null,
    caseFirNumber: record.case?.firNumber ?? null,
  };
}

function toDetail(record: IncidentRecord, audit: IncidentAuditView[]): IncidentDetail {
  return {
    ...toSummary(record),
    description: record.description,
    location: record.location,
    submittedByName: record.submittedBy.displayName,
    submittedAt: record.submittedAt,
    departmentVerifierName: record.departmentVerifiedBy?.displayName ?? null,
    departmentVerifiedAt: record.departmentVerifiedAt,
    crossVerifierName: record.crossVerifiedBy?.displayName ?? null,
    crossVerifiedAt: record.crossVerifiedAt,
    reviewReason: record.reviewReason,
    graphFocusId: record.graphEntity?.id ?? null,
    audit,
    people: record.people.map((participant) => ({
      id: participant.id,
      personId: participant.personId,
      graphEntityId: participant.graphEntityId,
      displayName: participant.person
        ? personName(participant.person)
        : participant.graphEntity?.displayLabel ?? "Authorized entity",
      participation: participant.participation as IncidentParticipation,
      notes: participant.notes,
    })),
    evidence: record.evidence.map((link) => ({
      id: link.id,
      evidenceId: link.evidence.id,
      originalFilename: link.evidence.originalFilename,
      verificationState: link.evidence.verificationState,
      note: link.note,
    })),
  };
}

function withinWindow(timestamp: Date, query: TimelineQuery): boolean {
  return (!query.startTime || timestamp >= query.startTime) && (!query.endTime || timestamp <= query.endTime);
}

function acceptsType(query: TimelineQuery, type: TimelineItem["type"]): boolean {
  return query.types.includes("ALL") || query.types.includes(type);
}

export class PrismaIncidentRepository implements IncidentRepository {
  async listForActor(actor: Actor): Promise<IncidentSummary[]> {
    const records = await prisma.incident.findMany({
      where: scope(actor),
      include: incidentInclude,
      orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
      take: 250,
    });
    return records.map(toSummary);
  }

  async findForActor(actor: Actor, incidentId: string): Promise<IncidentDetail | null> {
    const record = await prisma.incident.findFirst({ where: { id: incidentId, ...scope(actor) }, include: incidentInclude });
    if (!record) return null;
    const events = await prisma.auditEvent.findMany({
      where: { targetType: "INCIDENT", targetId: record.id, ...(actor.role === UserRole.Administrator ? {} : { departmentId: actor.departmentId }) },
      include: { actor: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return toDetail(record, events.map((event) => ({ id: event.id, action: event.action, outcome: event.outcome, actorName: event.actor?.displayName ?? null, createdAt: event.createdAt })));
  }

  async create(actor: Actor, input: IncidentInput, mode: "SUBMISSION" | "CANONICAL"): Promise<IncidentDetail> {
    try {
      const id = await prisma.$transaction(async (tx) => {
        const relatedCase = input.caseId
          ? await tx.case.findFirst({
              where: { id: input.caseId, ...(actor.role === UserRole.Administrator ? {} : { departmentId: actor.departmentId }) },
              select: { id: true, departmentId: true },
            })
          : null;
        if (input.caseId && !relatedCase) throw new NotFoundError();
        const departmentId = relatedCase?.departmentId ?? actor.departmentId;

        const people = input.people.length === 0 ? [] : await tx.person.findMany({
          where: {
            id: { in: input.people.flatMap((entry) => entry.personId ? [entry.personId] : []) },
            cases: { some: { case: { departmentId } } },
          },
          select: { id: true },
        });
        if (people.length !== new Set(input.people.flatMap((entry) => entry.personId ? [entry.personId] : [])).size) throw new NotFoundError();

        const entities = input.people.length === 0 ? [] : await tx.graphEntity.findMany({
          where: { id: { in: input.people.flatMap((entry) => entry.graphEntityId ? [entry.graphEntityId] : []) }, departmentId },
          select: { id: true },
        });
        if (entities.length !== new Set(input.people.flatMap((entry) => entry.graphEntityId ? [entry.graphEntityId] : [])).size) throw new NotFoundError();

        const evidence = input.evidenceIds.length === 0 ? [] : await tx.evidence.findMany({
          where: { id: { in: input.evidenceIds }, departmentId }, select: { id: true },
        });
        if (evidence.length !== new Set(input.evidenceIds).size) throw new NotFoundError();

        const canVerifyDirectly = mode === "CANONICAL" && input.evidenceIds.length > 0;
        const submissionStatus = mode === "SUBMISSION"
          ? IncidentSubmissionStatus.PendingReview
          : IncidentSubmissionStatus.Accepted;
        const verificationLevel = canVerifyDirectly
          ? actor.role === UserRole.Administrator
            ? IncidentVerificationLevel.CrossVerified
            : IncidentVerificationLevel.DepartmentVerified
          : IncidentVerificationLevel.Unverified;
        const created = await tx.incident.create({
          data: {
            incidentNumber: input.incidentNumber,
            incidentType: input.incidentType,
            title: input.title,
            description: input.description,
            occurredAt: input.occurredAt,
            location: input.location ?? null,
            departmentId,
            caseId: relatedCase?.id ?? null,
            submittedById: actor.userId,
            submissionStatus,
            verificationLevel,
            departmentVerifiedById: verificationLevel === IncidentVerificationLevel.DepartmentVerified ? actor.userId : null,
            departmentVerifiedAt: verificationLevel === IncidentVerificationLevel.DepartmentVerified ? new Date() : null,
            crossVerifiedById: verificationLevel === IncidentVerificationLevel.CrossVerified ? actor.userId : null,
            crossVerifiedAt: verificationLevel === IncidentVerificationLevel.CrossVerified ? new Date() : null,
            people: { create: input.people.map((entry) => ({ personId: entry.personId ?? null, graphEntityId: entry.graphEntityId ?? null, participation: entry.participation, notes: entry.notes ?? null })) },
            evidence: { create: input.evidenceIds.map((evidenceId) => ({ evidenceId })) },
          },
          select: { id: true },
        });
        await tx.graphEntity.create({
          data: {
            entityType: GraphEntityType.Incident,
            displayLabel: input.incidentNumber,
            verificationState: verificationLevel === IncidentVerificationLevel.Unverified ? VerificationState.Pending : VerificationState.Verified,
            departmentId,
            incidentId: created.id,
            canonicalReference: `incident:${input.incidentNumber}`,
          },
        });
        await tx.auditEvent.create({
          data: {
            actorId: actor.userId, departmentId, action: mode === "SUBMISSION" ? "INCIDENT_SUBMIT" : "INCIDENT_CREATE",
            targetType: "INCIDENT", targetId: created.id, outcome: "SUCCESS",
            metadata: { incidentNumber: input.incidentNumber, caseId: relatedCase?.id ?? null, sourceEvidenceCount: input.evidenceIds.length, submissionStatus, verificationLevel },
          },
        });
        return created.id;
      });
      const detail = await this.findForActor(actor, id);
      if (!detail) throw new NotFoundError();
      return detail;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictError("That incident number is already registered.");
      throw error;
    }
  }

  async update(actor: Actor, incidentId: string, input: IncidentUpdate): Promise<IncidentDetail | null> {
    return prisma.$transaction(async (tx) => {
      const incident = await tx.incident.findFirst({ where: { id: incidentId, ...scope(actor) }, select: { id: true, departmentId: true, caseId: true, status: true } });
      if (!incident) return null;
      const updated = await tx.incident.update({
        where: { id: incident.id },
        data: { incidentType: input.incidentType, title: input.title, description: input.description, occurredAt: input.occurredAt, location: input.location ?? null, status: input.status ?? undefined },
        select: { id: true },
      });
      await tx.auditEvent.create({ data: { actorId: actor.userId, departmentId: incident.departmentId, action: "INCIDENT_UPDATE", targetType: "INCIDENT", targetId: incident.id, outcome: "SUCCESS", metadata: { before: { status: incident.status, caseId: incident.caseId }, after: { status: input.status ?? incident.status, caseId: input.caseId ?? incident.caseId } } } });
      return updated.id;
    }).then((id) => id ? this.findForActor(actor, id) : null);
  }

  async review(actor: Actor, incidentId: string, review: IncidentReview): Promise<IncidentDetail | null> {
    return prisma.$transaction(async (tx) => {
      const incident = await tx.incident.findFirst({ where: { id: incidentId, ...scope(actor) }, select: { id: true, departmentId: true, submissionStatus: true } });
      if (!incident) return null;
      await tx.incident.update({ where: { id: incident.id }, data: { submissionStatus: review.decision, reviewReason: review.reason } });
      await tx.auditEvent.create({ data: { actorId: actor.userId, departmentId: incident.departmentId, action: `INCIDENT_REVIEW_${review.decision}`, targetType: "INCIDENT", targetId: incident.id, outcome: "SUCCESS", metadata: { previousSubmissionStatus: incident.submissionStatus, reason: review.reason } } });
      return incident.id;
    }).then((id) => id ? this.findForActor(actor, id) : null);
  }

  async verify(actor: Actor, incidentId: string, level: IncidentVerificationLevel, reason: string): Promise<IncidentDetail | null> {
    return prisma.$transaction(async (tx) => {
      const incident = await tx.incident.findFirst({ where: { id: incidentId, ...scope(actor) }, include: { _count: { select: { evidence: true } } } });
      if (!incident) return null;
      if (incident._count.evidence === 0) throw new ValidationError("Incident verification requires supporting evidence.");
      if (incident.submissionStatus !== IncidentSubmissionStatus.Accepted) throw new ValidationError("Only accepted incident submissions can be verified.");
      const isCross = level === IncidentVerificationLevel.CrossVerified;
      if (isCross && incident.verificationLevel !== IncidentVerificationLevel.DepartmentVerified) {
        throw new ValidationError("Cross-verification requires existing department verification.");
      }
      await tx.incident.update({ where: { id: incident.id }, data: {
        verificationLevel: level, reviewReason: reason,
        departmentVerifiedById: isCross ? incident.departmentVerifiedById : actor.userId,
        departmentVerifiedAt: isCross ? incident.departmentVerifiedAt : new Date(),
        crossVerifiedById: isCross ? actor.userId : incident.crossVerifiedById,
        crossVerifiedAt: isCross ? new Date() : incident.crossVerifiedAt,
      } });
      await tx.graphEntity.updateMany({ where: { incidentId: incident.id }, data: { verificationState: VerificationState.Verified } });
      await tx.auditEvent.create({ data: { actorId: actor.userId, departmentId: incident.departmentId, action: `INCIDENT_${level}`, targetType: "INCIDENT", targetId: incident.id, outcome: "SUCCESS", metadata: { previousVerificationLevel: incident.verificationLevel, reason } } });
      return incident.id;
    }).then((id) => id ? this.findForActor(actor, id) : null);
  }

  async timelineForActor(actor: Actor, query: TimelineQuery): Promise<TimelineItem[] | null> {
    const incidentScope = scope(actor);
    const [rootIncident, rootCase, rootPerson] = await Promise.all([
      query.incidentId ? prisma.incident.findFirst({ where: { id: query.incidentId, ...incidentScope }, select: { id: true } }) : Promise.resolve({ id: null }),
      query.caseId ? prisma.case.findFirst({ where: { id: query.caseId, ...(actor.role === UserRole.Administrator ? {} : { departmentId: actor.departmentId }) }, select: { id: true } }) : Promise.resolve({ id: null }),
      query.personId ? prisma.person.findFirst({ where: { id: query.personId, cases: { some: { case: actor.role === UserRole.Administrator ? {} : { departmentId: actor.departmentId } } } }, select: { id: true } }) : Promise.resolve({ id: null }),
    ]);
    if ((query.incidentId && !rootIncident?.id) || (query.caseId && !rootCase?.id) || (query.personId && !rootPerson?.id)) return null;

    const incidentWhere: Prisma.IncidentWhereInput = {
      ...incidentScope,
      ...(query.incidentId ? { id: query.incidentId } : {}),
      ...(query.caseId ? { caseId: query.caseId } : {}),
      ...(query.personId ? { people: { some: { personId: query.personId } } } : {}),
    };
    const incidents = await prisma.incident.findMany({
      where: incidentWhere,
      include: { people: { select: { personId: true } } },
      orderBy: { occurredAt: "desc" },
      take: 250,
    });
    const caseIds = new Set<string>([...incidents.flatMap((item) => item.caseId ? [item.caseId] : []), ...(query.caseId ? [query.caseId] : [])]);
    if (query.personId) {
      const memberships = await prisma.casePerson.findMany({ where: { personId: query.personId, case: actor.role === UserRole.Administrator ? {} : { departmentId: actor.departmentId } }, select: { caseId: true } });
      memberships.forEach((membership) => caseIds.add(membership.caseId));
    }
    const [evidence, cases, relationships] = await Promise.all([
      caseIds.size ? prisma.evidence.findMany({ where: { caseId: { in: [...caseIds] }, ...(actor.role === UserRole.Administrator ? {} : { departmentId: actor.departmentId }) }, select: { id: true, caseId: true, originalFilename: true, description: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 250 }) : Promise.resolve([]),
      caseIds.size ? prisma.case.findMany({ where: { id: { in: [...caseIds] }, ...(actor.role === UserRole.Administrator ? {} : { departmentId: actor.departmentId }) }, select: { id: true, firNumber: true, title: true, occurredAt: true, createdAt: true, people: { select: { personId: true } } } }) : Promise.resolve([]),
      query.personId ? prisma.graphRelationship.findMany({ where: { departmentId: actor.role === UserRole.Administrator ? undefined : actor.departmentId, OR: [{ sourceEntity: { personId: query.personId } }, { targetEntity: { personId: query.personId } }] }, select: { id: true, relationshipType: true, startsAt: true, endsAt: true, createdAt: true }, take: 250 }) : Promise.resolve([]),
    ]);
    const items: TimelineItem[] = [];
    for (const incident of incidents) if (withinWindow(incident.occurredAt, query) && acceptsType(query, "INCIDENT")) items.push({ id: `incident:${incident.id}`, type: "INCIDENT", timestamp: incident.occurredAt, title: incident.title, description: incident.description.slice(0, 280), sourceRecordType: "INCIDENT", sourceRecordId: incident.id, caseId: incident.caseId, incidentId: incident.id, personIds: incident.people.flatMap((person) => person.personId ? [person.personId] : []), evidenceId: null });
    for (const item of evidence) if (withinWindow(item.createdAt, query) && acceptsType(query, "EVIDENCE")) items.push({ id: `evidence:${item.id}`, type: "EVIDENCE", timestamp: item.createdAt, title: `Evidence attached: ${item.originalFilename}`, description: item.description ?? "Protected evidence added to an authorized case.", sourceRecordType: "EVIDENCE", sourceRecordId: item.id, caseId: item.caseId, incidentId: null, personIds: [], evidenceId: item.id });
    for (const item of cases) {
      const timestamp = item.occurredAt ?? item.createdAt;
      if (withinWindow(timestamp, query) && acceptsType(query, "CASE")) items.push({ id: `case:${item.id}`, type: "CASE", timestamp, title: `${item.firNumber}: ${item.title}`, description: "Authorized case occurrence or registration.", sourceRecordType: "CASE", sourceRecordId: item.id, caseId: item.id, incidentId: null, personIds: item.people.map((person) => person.personId), evidenceId: null });
    }
    for (const item of relationships) {
      const timestamp = item.endsAt ?? item.startsAt ?? item.createdAt;
      if (withinWindow(timestamp, query) && acceptsType(query, "RELATIONSHIP")) items.push({ id: `relationship:${item.id}`, type: "RELATIONSHIP", timestamp, title: `Relationship observation: ${item.relationshipType}`, description: "Authorized relationship observation.", sourceRecordType: "RELATIONSHIP", sourceRecordId: item.id, caseId: null, incidentId: null, personIds: query.personId ? [query.personId] : [], evidenceId: null });
    }
    return items.sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime() || left.id.localeCompare(right.id)).slice(0, 500);
  }
}
