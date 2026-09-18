import { Prisma } from "@prisma/client";
import type { Actor } from "@/domain/auth";
import type {
  CommunicationInput,
  CommunicationRecordView,
  FinancialTransactionInput,
  FinancialTransactionView,
} from "@/domain/activity";
import { ConflictError, NotFoundError } from "@/domain/errors";
import { IncidentVerificationLevel, UserRole } from "@/domain/model";
import { prisma } from "@/server/db/client";
import type { ActivityRepository } from "./activity-repository";

const activityEntitySelect = { id: true, displayLabel: true, departmentId: true } as const;

function authorizedDepartment(actor: Actor, departmentId: string): boolean {
  return actor.role === UserRole.Administrator || actor.departmentId === departmentId;
}

async function validateLinks(
  tx: Prisma.TransactionClient,
  actor: Actor,
  sourceEntityId: string,
  destinationEntityId: string,
  links: { caseId?: string; incidentId?: string; sourceEvidenceId?: string },
) {
  const [source, destination] = await Promise.all([
    tx.graphEntity.findFirst({ where: { id: sourceEntityId, ...(actor.role === UserRole.Administrator ? {} : { departmentId: actor.departmentId }) }, select: activityEntitySelect }),
    tx.graphEntity.findFirst({ where: { id: destinationEntityId, ...(actor.role === UserRole.Administrator ? {} : { departmentId: actor.departmentId }) }, select: activityEntitySelect }),
  ]);
  if (!source || !destination || source.departmentId !== destination.departmentId || !authorizedDepartment(actor, source.departmentId)) throw new NotFoundError();
  const departmentId = source.departmentId;
  const checks = await Promise.all([
    links.caseId ? tx.case.findFirst({ where: { id: links.caseId, departmentId }, select: { id: true } }) : Promise.resolve({ id: null }),
    links.incidentId ? tx.incident.findFirst({ where: { id: links.incidentId, departmentId }, select: { id: true } }) : Promise.resolve({ id: null }),
    links.sourceEvidenceId ? tx.evidence.findFirst({ where: { id: links.sourceEvidenceId, departmentId }, select: { id: true } }) : Promise.resolve({ id: null }),
  ]);
  if ((links.caseId && !checks[0]?.id) || (links.incidentId && !checks[1]?.id) || (links.sourceEvidenceId && !checks[2]?.id)) throw new NotFoundError();
  return { source, destination, departmentId };
}

function communicationView(record: {
  id: string; communicationNumber: string; communicationType: string; occurredAt: Date; direction: string; durationSeconds: number | null; caseId: string | null; incidentId: string | null; sourceEvidenceId: string | null; verificationLevel: string;
  sourceEntity: { id: string; displayLabel: string }; destinationEntity: { id: string; displayLabel: string };
}): CommunicationRecordView {
  return { id: record.id, recordNumber: record.communicationNumber, communicationType: record.communicationType as CommunicationRecordView["communicationType"], occurredAt: record.occurredAt, direction: record.direction as CommunicationRecordView["direction"], durationSeconds: record.durationSeconds, sourceEntityId: record.sourceEntity.id, sourceLabel: record.sourceEntity.displayLabel, destinationEntityId: record.destinationEntity.id, destinationLabel: record.destinationEntity.displayLabel, caseId: record.caseId, incidentId: record.incidentId, sourceEvidenceId: record.sourceEvidenceId, verificationLevel: record.verificationLevel as IncidentVerificationLevel };
}

function financialView(record: {
  id: string; transactionNumber: string; transactionType: string; occurredAt: Date; amount: Prisma.Decimal; currency: string; caseId: string | null; incidentId: string | null; sourceEvidenceId: string | null; verificationLevel: string;
  sourceEntity: { id: string; displayLabel: string }; destinationEntity: { id: string; displayLabel: string };
}): FinancialTransactionView {
  return { id: record.id, recordNumber: record.transactionNumber, transactionType: record.transactionType as FinancialTransactionView["transactionType"], occurredAt: record.occurredAt, amount: record.amount.toNumber(), currency: record.currency, sourceEntityId: record.sourceEntity.id, sourceLabel: record.sourceEntity.displayLabel, destinationEntityId: record.destinationEntity.id, destinationLabel: record.destinationEntity.displayLabel, caseId: record.caseId, incidentId: record.incidentId, sourceEvidenceId: record.sourceEvidenceId, verificationLevel: record.verificationLevel as IncidentVerificationLevel };
}

export class PrismaActivityRepository implements ActivityRepository {
  async createCommunication(actor: Actor, input: CommunicationInput): Promise<CommunicationRecordView> {
    try {
      return await prisma.$transaction(async (tx) => {
        const validated = await validateLinks(tx, actor, input.sourceEntityId, input.destinationEntityId, input);
        const record = await tx.communicationRecord.create({ data: { ...input, sourceIdentifier: input.sourceIdentifier ?? null, destinationIdentifier: input.destinationIdentifier ?? null, durationSeconds: input.durationSeconds ?? null, caseId: input.caseId ?? null, incidentId: input.incidentId ?? null, sourceEvidenceId: input.sourceEvidenceId ?? null, departmentId: validated.departmentId }, include: { sourceEntity: { select: { id: true, displayLabel: true } }, destinationEntity: { select: { id: true, displayLabel: true } } } });
        await tx.auditEvent.create({ data: { actorId: actor.userId, departmentId: validated.departmentId, action: "COMMUNICATION_CREATE", targetType: "COMMUNICATION", targetId: record.id, outcome: "SUCCESS", metadata: { recordNumber: record.communicationNumber, caseId: record.caseId, incidentId: record.incidentId, verificationLevel: record.verificationLevel } } });
        return communicationView(record);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictError("That communication record number is already registered.");
      throw error;
    }
  }

  async createFinancialTransaction(actor: Actor, input: FinancialTransactionInput): Promise<FinancialTransactionView> {
    try {
      return await prisma.$transaction(async (tx) => {
        const validated = await validateLinks(tx, actor, input.sourceEntityId, input.destinationEntityId, input);
        const record = await tx.financialTransaction.create({ data: { ...input, amount: new Prisma.Decimal(input.amount), caseId: input.caseId ?? null, incidentId: input.incidentId ?? null, sourceEvidenceId: input.sourceEvidenceId ?? null, departmentId: validated.departmentId }, include: { sourceEntity: { select: { id: true, displayLabel: true } }, destinationEntity: { select: { id: true, displayLabel: true } } } });
        await tx.auditEvent.create({ data: { actorId: actor.userId, departmentId: validated.departmentId, action: "FINANCIAL_TRANSACTION_CREATE", targetType: "FINANCIAL_TRANSACTION", targetId: record.id, outcome: "SUCCESS", metadata: { recordNumber: record.transactionNumber, amount: input.amount, currency: input.currency, caseId: record.caseId, incidentId: record.incidentId, verificationLevel: record.verificationLevel } } });
        return financialView(record);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictError("That transaction number is already registered.");
      throw error;
    }
  }
}
