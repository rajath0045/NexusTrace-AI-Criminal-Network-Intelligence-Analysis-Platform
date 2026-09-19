// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/domain/model";
import { AuthorizationError } from "@/domain/auth";
import { getCurrentActor } from "@/server/auth/session";
import { listAuditEvents } from "@/server/services/audit-service";
import { GET } from "./route";

vi.mock("@/server/auth/session", () => ({ getCurrentActor: vi.fn() }));
vi.mock("@/server/services/audit-service", () => ({ listAuditEvents: vi.fn() }));
const investigator = { userId: "user", email: "investigator@nexustrace.demo", displayName: "Investigator", role: UserRole.Investigator, departmentId: "cyber" };
describe("audit route", () => {
  beforeEach(() => vi.mocked(getCurrentActor).mockResolvedValue(investigator));
  it("does not disclose audit history to an unauthorized role", async () => {
    vi.mocked(listAuditEvents).mockRejectedValueOnce(new AuthorizationError());
    const response = await GET(new Request("http://localhost/api/audit"));
    expect(response.status).toBe(403); expect(await response.json()).toEqual({ error: "You do not have permission to perform this action." });
  });
});
