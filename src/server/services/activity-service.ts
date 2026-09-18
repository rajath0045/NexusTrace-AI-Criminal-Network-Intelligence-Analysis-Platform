import type { Actor } from "@/domain/auth";
import { communicationInputSchema, financialTransactionInputSchema, type CommunicationInput, type CommunicationRecordView, type FinancialTransactionInput, type FinancialTransactionView } from "@/domain/activity";
import { ValidationError } from "@/domain/errors";
import { assertCan } from "@/server/authorization/policy";
import { PrismaActivityRepository } from "@/server/repositories/prisma-activity-repository";
import type { ActivityRepository } from "@/server/repositories/activity-repository";

function parse<T>(result: { success: true; data: T } | { success: false; error: { issues: Array<{ message: string }> } }): T {
  if (!result.success) throw new ValidationError(result.error.issues[0]?.message);
  return result.data;
}

export class ActivityService {
  constructor(private readonly repository: ActivityRepository) {}

  async createCommunication(actor: Actor, input: CommunicationInput): Promise<CommunicationRecordView> {
    assertCan(actor, "ACTIVITY_CREATE");
    return this.repository.createCommunication(actor, parse(communicationInputSchema.safeParse(input)));
  }

  async createFinancialTransaction(actor: Actor, input: FinancialTransactionInput): Promise<FinancialTransactionView> {
    assertCan(actor, "ACTIVITY_CREATE");
    return this.repository.createFinancialTransaction(actor, parse(financialTransactionInputSchema.safeParse(input)));
  }
}

const activityService = new ActivityService(new PrismaActivityRepository());
export const createCommunication = activityService.createCommunication.bind(activityService);
export const createFinancialTransaction = activityService.createFinancialTransaction.bind(activityService);
