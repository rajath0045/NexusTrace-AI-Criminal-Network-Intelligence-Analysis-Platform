import type { Actor } from "@/domain/auth";
import type { FindingQualityMetrics, FindingQueuePage, FindingQueueQuery, FindingReviewInput, InvestigationAnalysis, PersistedFindingView } from "@/domain/investigation";

export interface FindingRepository {
  departments(actor: Actor): Promise<Array<{ id: string; name: string }>>;
  sync(actor: Actor, analysis: InvestigationAnalysis): Promise<Map<string, { id: string; status: string }>>;
  list(actor: Actor, query: FindingQueueQuery): Promise<FindingQueuePage>;
  find(actor: Actor, findingId: string): Promise<PersistedFindingView | null>;
  review(actor: Actor, findingId: string, input: FindingReviewInput): Promise<PersistedFindingView | null>;
  metrics(actor: Actor): Promise<FindingQualityMetrics>;
}
