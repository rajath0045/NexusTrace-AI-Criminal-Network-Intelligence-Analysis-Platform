import type { Actor } from "@/domain/auth";
import type { CaseDetail, CaseInput, CaseSummary } from "@/domain/case";

export interface CaseRepository {
  listForActor(actor: Actor): Promise<CaseSummary[]>;
  findForActor(actor: Actor, caseId: string): Promise<CaseDetail | null>;
  create(actor: Actor, input: CaseInput): Promise<CaseDetail>;
}
