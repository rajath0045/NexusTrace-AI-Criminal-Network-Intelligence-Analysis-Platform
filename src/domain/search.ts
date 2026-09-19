import { z } from "zod";

export const globalSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
});

export type GlobalSearchQuery = z.infer<typeof globalSearchQuerySchema>;

export type SearchResultType = "CASE" | "PERSON" | "INCIDENT" | "ENTITY";

export interface GlobalSearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  metadata: string;
  href: string;
}

export interface GlobalSearchResponse {
  query: string;
  groups: Array<{ type: SearchResultType; label: string; results: GlobalSearchResult[] }>;
}
