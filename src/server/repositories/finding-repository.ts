import type { Actor } from "@/domain/auth";
import type { FindingQueueQuery, FindingReviewInput, InvestigationAnalysis, PersistedFindingView } from "@/domain/investigation";

export interface FindingRepository {
  sync(actor: Actor, analysis: InvestigationAnalysis): Promise<Map<string, { id: string; status: string }>>;
  list(actor: Actor, query: FindingQueueQuery): Promise<PersistedFindingView[]>;
  find(actor: Actor, findingId: string): Promise<PersistedFindingView | null>;
  review(actor: Actor, findingId: string, input: FindingReviewInput): Promise<PersistedFindingView | null>;
}
