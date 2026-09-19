import type { Actor } from "@/domain/auth";
import type { GlobalSearchQuery } from "@/domain/search";
import { globalSearchQuerySchema } from "@/domain/search";
import { ValidationError } from "@/domain/errors";
import { assertCan } from "@/server/authorization/policy";
import { PrismaSearchRepository } from "@/server/repositories/prisma-search-repository";
import type { SearchRepository } from "@/server/repositories/search-repository";

export class SearchService {
  constructor(private readonly repository: SearchRepository) {}
  async search(actor: Actor, query: GlobalSearchQuery) {
    assertCan(actor, "CASE_VIEW");
    const parsed = globalSearchQuerySchema.safeParse(query);
    if (!parsed.success) throw new ValidationError("Enter at least two characters to search authorized records.");
    return this.repository.search(actor, parsed.data);
  }
}
const searchService = new SearchService(new PrismaSearchRepository());
export const searchAuthorizedRecords = searchService.search.bind(searchService);
