import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@/domain/auth";
import { UserRole } from "@/domain/model";
import type { SearchRepository } from "@/server/repositories/search-repository";
import { SearchService } from "./search-service";

const investigator: Actor = { userId: "investigator", email: "investigator@nexustrace.demo", displayName: "Investigator", role: UserRole.Investigator, departmentId: "cyber" };

describe("SearchService", () => {
  it("uses the server repository only after validating an authorized search query", async () => {
    const repository: SearchRepository = { search: vi.fn(async () => ({ query: "FIR", groups: [] })) };
    const service = new SearchService(repository);
    await expect(service.search(investigator, { q: "FIR" })).resolves.toEqual({ query: "FIR", groups: [] });
    expect(repository.search).toHaveBeenCalledWith(investigator, { q: "FIR" });
  });

  it("rejects an invalid query before reaching the repository", async () => {
    const repository: SearchRepository = { search: vi.fn() };
    await expect(new SearchService(repository).search(investigator, { q: "x" })).rejects.toMatchObject({ code: "VALIDATION" });
    expect(repository.search).not.toHaveBeenCalled();
  });
});
