import { Prisma } from "@prisma/client";
import type { Actor } from "@/domain/auth";
import type { EvidenceCreateData, EvidenceRecord } from "@/domain/evidence";
import { ConflictError, NotFoundError } from "@/domain/errors";
import { UserRole, VerificationState } from "@/domain/model";
import { prisma } from "@/server/db/client";
import type { EvidenceRepository } from "./evidence-repository";

const evidenceInclude = {
  uploadedBy: { select: { displayName: true } },
} as const;

function actorCaseScope(actor: Actor): Prisma.CaseWhereInput {
  return actor.role === UserRole.Administrator
    ? {}
    : { departmentId: actor.departmentId };
}

function actorEvidenceScope(actor: Actor): Prisma.EvidenceWhereInput {
  return actor.role === UserRole.Administrator
    ? {}
    : { departmentId: actor.departmentId };
}

function toEvidenceRecord(record: {
  id: string;
  caseId: string;
  originalFilename: string;
  mediaType: string;
  byteSize: number;
  checksumSha256: string;
  storageKey: string;
  description: string | null;
  verificationState: string;
  createdAt: Date;
  uploadedBy: { displayName: string };
}): EvidenceRecord {
  return {
    id: record.id,
    caseId: record.caseId,
    originalFilename: record.originalFilename,
    mediaType: record.mediaType,
    byteSize: record.byteSize,
    checksumSha256: record.checksumSha256,
    storageKey: record.storageKey,
    description: record.description,
    verificationState: record.verificationState as VerificationState,
    uploadedAt: record.createdAt,
    uploadedByName: record.uploadedBy.displayName,
  };
}

export class PrismaEvidenceRepository implements EvidenceRepository {
  async findCaseForActor(actor: Actor, caseId: string): Promise<{ id: string } | null> {
    return prisma.case.findFirst({
      where: { id: caseId, ...actorCaseScope(actor) },
      select: { id: true },
    });
  }

  async listForCase(actor: Actor, caseId: string): Promise<EvidenceRecord[] | null> {
    const targetCase = await this.findCaseForActor(actor, caseId);
    if (!targetCase) return null;
    const evidence = await prisma.evidence.findMany({
      where: { caseId, ...actorEvidenceScope(actor) },
      include: evidenceInclude,
      orderBy: { createdAt: "desc" },
    });
    return evidence.map(toEvidenceRecord);
  }

  async create(
    actor: Actor,
    caseId: string,
    data: EvidenceCreateData,
  ): Promise<EvidenceRecord> {
    try {
      return await prisma.$transaction(async (transaction) => {
        const targetCase = await transaction.case.findFirst({
          where: { id: caseId, ...actorCaseScope(actor) },
          select: { id: true, departmentId: true },
        });
        if (!targetCase) throw new NotFoundError();

        const record = await transaction.evidence.create({
          data: {
            ...data,
            description: data.description ?? null,
            caseId,
            departmentId: targetCase.departmentId,
            uploadedById: actor.userId,
          },
          include: evidenceInclude,
        });

        await transaction.auditEvent.create({
          data: {
            actorId: actor.userId,
            departmentId: targetCase.departmentId,
            action: "EVIDENCE_ATTACH",
            targetType: "EVIDENCE",
            targetId: record.id,
            outcome: "SUCCESS",
            metadata: {
              caseId,
              mediaType: record.mediaType,
              byteSize: record.byteSize,
              checksumSha256: record.checksumSha256,
            },
          },
        });

        return toEvidenceRecord(record);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("The generated evidence storage key is already in use.");
      }
      throw error;
    }
  }

  async findForActor(actor: Actor, evidenceId: string): Promise<EvidenceRecord | null> {
    const record = await prisma.evidence.findFirst({
      where: { id: evidenceId, ...actorEvidenceScope(actor) },
      include: evidenceInclude,
    });
    return record ? toEvidenceRecord(record) : null;
  }
}
