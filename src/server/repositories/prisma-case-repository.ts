import { Prisma, VerificationState } from "@prisma/client";
import type { Actor } from "@/domain/auth";
import type { CaseDetail, CaseInput, CaseSummary } from "@/domain/case";
import { ConflictError } from "@/domain/errors";
import { CaseStatus, UserRole } from "@/domain/model";
import { prisma } from "@/server/db/client";
import type { CaseRepository } from "./case-repository";

const caseDetailInclude = {
  department: { select: { name: true } },
  investigatingOfficer: { select: { displayName: true } },
  _count: { select: { people: true, evidence: true } },
} as const;

function toCaseSummary(record: {
  id: string;
  firNumber: string;
  caseNumber: string;
  title: string;
  category: string;
  status: string;
  updatedAt: Date;
  department: { name: string };
}): CaseSummary {
  return {
    id: record.id,
    firNumber: record.firNumber,
    caseNumber: record.caseNumber,
    title: record.title,
    category: record.category,
    status: record.status as CaseStatus,
    departmentName: record.department.name,
    updatedAt: record.updatedAt,
  };
}

function toCaseDetail(record: {
  id: string;
  firNumber: string;
  caseNumber: string;
  title: string;
  category: string;
  status: string;
  description: string;
  occurredAt: Date | null;
  occurrenceLocation: string | null;
  updatedAt: Date;
  department: { name: string };
  investigatingOfficer: { displayName: string } | null;
  _count: { people: number; evidence: number };
}): CaseDetail {
  return {
    ...toCaseSummary(record),
    description: record.description,
    occurredAt: record.occurredAt,
    occurrenceLocation: record.occurrenceLocation,
    investigatingOfficerName: record.investigatingOfficer?.displayName ?? null,
    peopleCount: record._count.people,
    evidenceCount: record._count.evidence,
  };
}

function actorScope(actor: Actor) {
  return actor.role === UserRole.Administrator
    ? {}
    : { departmentId: actor.departmentId };
}

export class PrismaCaseRepository implements CaseRepository {
  async listForActor(actor: Actor): Promise<CaseSummary[]> {
    const records = await prisma.case.findMany({
      where: actorScope(actor),
      include: { department: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return records.map(toCaseSummary);
  }

  async findForActor(actor: Actor, caseId: string): Promise<CaseDetail | null> {
    const record = await prisma.case.findFirst({
      where: { id: caseId, ...actorScope(actor) },
      include: caseDetailInclude,
    });

    return record ? toCaseDetail(record) : null;
  }

  async create(actor: Actor, input: CaseInput): Promise<CaseDetail> {
    try {
      return await prisma.$transaction(async (transaction) => {
        const record = await transaction.case.create({
          data: {
            ...input,
            occurrenceLocation: input.occurrenceLocation || null,
            departmentId: actor.departmentId,
            investigatingOfficerId: actor.userId,
          },
          include: caseDetailInclude,
        });

        await transaction.graphEntity.create({
          data: {
            entityType: "CASE",
            displayLabel: record.firNumber,
            verificationState: VerificationState.VERIFIED,
            departmentId: actor.departmentId,
            caseId: record.id,
            canonicalReference: `case:${record.firNumber}`,
          },
        });

        await transaction.auditEvent.create({
          data: {
            actorId: actor.userId,
            departmentId: actor.departmentId,
            action: "CASE_CREATE",
            targetType: "CASE",
            targetId: record.id,
            outcome: "SUCCESS",
            metadata: { firNumber: record.firNumber, category: record.category },
          },
        });

        return toCaseDetail(record);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("That FIR or case number is already registered.");
      }
      throw error;
    }
  }
}
