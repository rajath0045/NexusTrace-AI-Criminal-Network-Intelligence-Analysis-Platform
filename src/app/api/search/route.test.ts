// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/domain/model";
import { getCurrentActor } from "@/server/auth/session";
import { searchAuthorizedRecords } from "@/server/services/search-service";
import { GET } from "./route";

vi.mock("@/server/auth/session", () => ({ getCurrentActor: vi.fn() }));
vi.mock("@/server/services/search-service", () => ({ searchAuthorizedRecords: vi.fn() }));
const actor = { userId: "user", email: "user@nexustrace.demo", displayName: "User", role: UserRole.DepartmentUser, departmentId: "cyber" };

describe("authorized search route", () => {
  beforeEach(() => { vi.mocked(getCurrentActor).mockResolvedValue(actor); vi.mocked(searchAuthorizedRecords).mockResolvedValue({ query: "FIR", groups: [] }); });
  it("requires a session and never falls back to a client-side data source", async () => {
    vi.mocked(getCurrentActor).mockResolvedValueOnce(null);
    expect((await GET(new Request("http://localhost/api/search?q=FIR"))).status).toBe(401);
    expect(searchAuthorizedRecords).not.toHaveBeenCalled();
  });
  it("delegates the scoped query to the authorized search service", async () => {
    const response = await GET(new Request("http://localhost/api/search?q=FIR"));
    expect(response.status).toBe(200); expect(searchAuthorizedRecords).toHaveBeenCalledWith(actor, { q: "FIR" });
  });
});
