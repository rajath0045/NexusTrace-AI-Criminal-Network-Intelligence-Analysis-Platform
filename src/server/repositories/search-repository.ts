import type { Actor } from "@/domain/auth";
import type { GlobalSearchQuery, GlobalSearchResponse } from "@/domain/search";

export interface SearchRepository {
  search(actor: Actor, query: GlobalSearchQuery): Promise<GlobalSearchResponse>;
}
