import type { Actor } from "@/domain/auth";
import type {
  CaseParticipant,
  CasePersonInput,
  PersonProfile,
  PersonReference,
} from "@/domain/person";

export interface PersonRepository {
  findProfileForActor(actor: Actor, personId: string): Promise<PersonProfile | null>;
  listForCase(actor: Actor, caseId: string): Promise<CaseParticipant[] | null>;
  listAssociationCandidates(actor: Actor, caseId: string): Promise<PersonReference[] | null>;
  associateWithCase(actor: Actor, input: CasePersonInput): Promise<CaseParticipant>;
}
