import type { Actor } from "@/domain/auth";
import type { EvidenceCreateData, EvidenceRecord } from "@/domain/evidence";

export interface EvidenceRepository {
  findCaseForActor(actor: Actor, caseId: string): Promise<{ id: string } | null>;
  listForCase(actor: Actor, caseId: string): Promise<EvidenceRecord[] | null>;
  create(actor: Actor, caseId: string, data: EvidenceCreateData): Promise<EvidenceRecord>;
  findForActor(actor: Actor, evidenceId: string): Promise<EvidenceRecord | null>;
}
