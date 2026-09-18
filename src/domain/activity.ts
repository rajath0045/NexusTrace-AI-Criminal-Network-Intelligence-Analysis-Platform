import { z } from "zod";
import {
  CommunicationDirection,
  CommunicationType,
  FinancialTransactionType,
  IncidentVerificationLevel,
} from "./model";

const optionalId = z.preprocess((value) => value === "" ? undefined : value, z.string().uuid().optional());
const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(max).optional(),
);

const activityLinks = {
  caseId: optionalId,
  incidentId: optionalId,
  sourceEvidenceId: optionalId,
  verificationLevel: z.enum(IncidentVerificationLevel).default(IncidentVerificationLevel.Unverified),
};

export const communicationInputSchema = z.object({
  communicationNumber: z.string().trim().min(3).max(64).transform((value) => value.toUpperCase()),
  communicationType: z.enum(CommunicationType),
  occurredAt: z.coerce.date(),
  sourceEntityId: z.string().uuid(),
  destinationEntityId: z.string().uuid(),
  sourceIdentifier: optionalText(160),
  destinationIdentifier: optionalText(160),
  durationSeconds: z.coerce.number().int().min(0).max(86_400).optional(),
  direction: z.enum(CommunicationDirection).default(CommunicationDirection.Unknown),
  ...activityLinks,
}).refine((value) => value.sourceEntityId !== value.destinationEntityId, {
  message: "A communication must connect two distinct entities.",
  path: ["destinationEntityId"],
});

export const financialTransactionInputSchema = z.object({
  transactionNumber: z.string().trim().min(3).max(64).transform((value) => value.toUpperCase()),
  transactionType: z.enum(FinancialTransactionType),
  occurredAt: z.coerce.date(),
  sourceEntityId: z.string().uuid(),
  destinationEntityId: z.string().uuid(),
  amount: z.coerce.number().positive().max(1_000_000_000),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a three-letter currency code.").default("INR"),
  ...activityLinks,
}).refine((value) => value.sourceEntityId !== value.destinationEntityId, {
  message: "A transaction must connect two distinct entities.",
  path: ["destinationEntityId"],
});

export type CommunicationInput = z.infer<typeof communicationInputSchema>;
export type FinancialTransactionInput = z.infer<typeof financialTransactionInputSchema>;

export interface ActivityRecordView {
  id: string;
  recordNumber: string;
  occurredAt: Date;
  sourceEntityId: string;
  sourceLabel: string;
  destinationEntityId: string;
  destinationLabel: string;
  caseId: string | null;
  incidentId: string | null;
  sourceEvidenceId: string | null;
  verificationLevel: IncidentVerificationLevel;
}

export interface CommunicationRecordView extends ActivityRecordView {
  communicationType: CommunicationType;
  direction: CommunicationDirection;
  durationSeconds: number | null;
}

export interface FinancialTransactionView extends ActivityRecordView {
  transactionType: FinancialTransactionType;
  amount: number;
  currency: string;
}
