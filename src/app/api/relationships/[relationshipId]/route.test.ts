// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/domain/model";
import { getCurrentActor } from "@/server/auth/session";
import { getRelationshipDetail } from "@/server/services/graph-service";
import { GET } from "./route";

vi.mock("@/server/auth/session", () => ({ getCurrentActor: vi.fn() }));
vi.mock("@/server/services/graph-service", () => ({ getRelationshipDetail: vi.fn() }));

const actor = { userId: "user", email: "user@nexustrace.demo", displayName: "User", role: UserRole.Investigator, departmentId: "cyber" };

describe("connection details route", () => {
  beforeEach(() => vi.mocked(getCurrentActor).mockResolvedValue(actor));

  it("does not leak whether an inaccessible relationship exists", async () => {
    vi.mocked(getRelationshipDetail).mockRejectedValueOnce({ code: "NOT_FOUND" });
    const response = await GET(new Request("http://localhost/api/relationships/private-edge"), { params: Promise.resolve({ relationshipId: "private-edge" }) });
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Connection not found.");
  });
});
