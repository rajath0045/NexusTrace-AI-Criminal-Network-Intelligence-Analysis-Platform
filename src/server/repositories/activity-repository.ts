import type { Actor } from "@/domain/auth";
import type {
  CommunicationInput,
  CommunicationRecordView,
  FinancialTransactionInput,
  FinancialTransactionView,
} from "@/domain/activity";

export interface ActivityRepository {
  createCommunication(actor: Actor, input: CommunicationInput): Promise<CommunicationRecordView>;
  createFinancialTransaction(actor: Actor, input: FinancialTransactionInput): Promise<FinancialTransactionView>;
}
