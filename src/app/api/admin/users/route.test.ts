// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/domain/model";
import { AuthorizationError } from "@/domain/auth";
import { getCurrentActor } from "@/server/auth/session";
import { listAdministrationUsers } from "@/server/services/administration-service";
import { GET } from "./route";

vi.mock("@/server/auth/session", () => ({ getCurrentActor: vi.fn() }));
vi.mock("@/server/services/administration-service", () => ({ listAdministrationUsers: vi.fn() }));
const department = { userId: "user", email: "department@nexustrace.demo", displayName: "Department", role: UserRole.DepartmentUser, departmentId: "cyber" };
describe("administration users route", () => {
  beforeEach(() => vi.mocked(getCurrentActor).mockResolvedValue(department));
  it("returns a generic forbidden response for non-administrators", async () => {
    vi.mocked(listAdministrationUsers).mockRejectedValueOnce(new AuthorizationError());
    const response = await GET(new Request("http://localhost/api/admin/users"));
    expect(response.status).toBe(403); expect(await response.json()).toEqual({ error: "You do not have permission to perform this action." });
  });
});
