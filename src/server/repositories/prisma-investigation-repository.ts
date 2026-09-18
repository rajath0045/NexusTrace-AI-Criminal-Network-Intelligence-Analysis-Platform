import type { Actor } from "@/domain/auth";
import type { InvestigationQuery } from "@/domain/investigation";
import { UserRole } from "@/domain/model";
import { prisma } from "@/server/db/client";
import type { InvestigationContextData, InvestigationRepository } from "./investigation-repository";

function scopedDepartment(actor: Actor) {
  return actor.role === UserRole.Administrator ? {} : { departmentId: actor.departmentId };
}

function range(query: InvestigationQuery, incidentTime: Date) {
  const windowStart = new Date(incidentTime.getTime() - query.beforeDays * 86_400_000);
  const windowEnd = new Date(incidentTime.getTime() + query.afterDays * 86_400_000);
  const baselineStart = new Date(windowStart.getTime() - query.beforeDays * 86_400_000);
  return { baselineStart, windowEnd };
}

export class PrismaInvestigationRepository implements InvestigationRepository {
  async contextForActor(actor: Actor, query: InvestigationQuery): Promise<InvestigationContextData | null> {
    const incident = await prisma.incident.findFirst({ where: { id: query.incidentId, ...scopedDepartment(actor) }, select: { id: true, incidentNumber: true, title: true, occurredAt: true, departmentId: true } });
    if (!incident) return null;
    const person = await prisma.person.findFirst({ where: { id: query.personId, cases: { some: { case: { departmentId: incident.departmentId } } } }, select: { id: true, givenName: true, familyName: true, graphEntity: { select: { id: true } } } });
    if (!person?.graphEntity) return null;
    const { baselineStart, windowEnd } = range(query, incident.occurredAt);
    const entityIds = [person.graphEntity.id];
    const activityWhere = { departmentId: incident.departmentId, occurredAt: { gte: baselineStart, lte: windowEnd }, OR: [{ sourceEntityId: { in: entityIds } }, { destinationEntityId: { in: entityIds } }] };
    const [communications, transactions, relationships] = await Promise.all([
      prisma.communicationRecord.findMany({ where: activityWhere, select: { id: true, communicationType: true, occurredAt: true, sourceEntityId: true, destinationEntityId: true, caseId: true, incidentId: true, sourceEvidenceId: true, verificationLevel: true, sourceEntity: { select: { displayLabel: true } }, destinationEntity: { select: { displayLabel: true } } }, orderBy: { occurredAt: "asc" }, take: 500 }),
      prisma.financialTransaction.findMany({ where: activityWhere, select: { id: true, transactionType: true, occurredAt: true, sourceEntityId: true, destinationEntityId: true, amount: true, currency: true, caseId: true, incidentId: true, sourceEvidenceId: true, verificationLevel: true, sourceEntity: { select: { displayLabel: true } }, destinationEntity: { select: { displayLabel: true } } }, orderBy: { occurredAt: "asc" }, take: 500 }),
      prisma.graphRelationship.findMany({ where: { departmentId: incident.departmentId, AND: [{ OR: [{ sourceEntityId: { in: entityIds } }, { targetEntityId: { in: entityIds } }] }, { OR: [{ startsAt: { gte: baselineStart, lte: windowEnd } }, { endsAt: { gte: baselineStart, lte: windowEnd } }] }] }, select: { id: true, sourceEntityId: true, targetEntityId: true, relationshipType: true, startsAt: true, endsAt: true, createdAt: true, verificationState: true, evidence: { select: { evidenceId: true } } }, take: 250 }),
    ]);
    return {
      person: { id: person.id, displayName: `${person.givenName} ${person.familyName}`, entityIds },
      incident,
      activities: [
        ...communications.map((record) => ({ id: record.id, kind: "COMMUNICATION" as const, subtype: record.communicationType, occurredAt: record.occurredAt, sourceEntityId: record.sourceEntityId, sourceLabel: record.sourceEntity.displayLabel, destinationEntityId: record.destinationEntityId, destinationLabel: record.destinationEntity.displayLabel, caseId: record.caseId, incidentId: record.incidentId, sourceEvidenceId: record.sourceEvidenceId, verificationLevel: record.verificationLevel })),
        ...transactions.map((record) => ({ id: record.id, kind: "FINANCIAL" as const, subtype: record.transactionType, occurredAt: record.occurredAt, sourceEntityId: record.sourceEntityId, sourceLabel: record.sourceEntity.displayLabel, destinationEntityId: record.destinationEntityId, destinationLabel: record.destinationEntity.displayLabel, caseId: record.caseId, incidentId: record.incidentId, sourceEvidenceId: record.sourceEvidenceId, verificationLevel: record.verificationLevel, amount: record.amount.toNumber(), currency: record.currency })),
      ],
      relationships: relationships.map((record) => ({ id: record.id, occurredAt: record.endsAt ?? record.startsAt ?? record.createdAt, sourceEntityId: record.sourceEntityId, targetEntityId: record.targetEntityId, relationshipType: record.relationshipType, verificationLevel: record.verificationState === "VERIFIED" ? "DEPARTMENT_VERIFIED" : "UNVERIFIED", evidenceIds: record.evidence.map((source) => source.evidenceId) })),
    };
  }
}
