// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/domain/model";
import { getCurrentActor } from "@/server/auth/session";
import { getGeographicProjection } from "@/server/services/geography-service";
import { GET } from "./route";

vi.mock("@/server/auth/session", () => ({ getCurrentActor: vi.fn() }));
vi.mock("@/server/services/geography-service", () => ({ getGeographicProjection: vi.fn() }));

const actor = { userId: "user", email: "user@nexustrace.demo", displayName: "User", role: UserRole.Investigator, departmentId: "cyber" };
const focus = "60000000-0000-4000-8000-000000000001";

describe("geographic network route", () => {
  beforeEach(() => vi.mocked(getCurrentActor).mockResolvedValue(actor));

  it("requires an authenticated session", async () => {
    vi.mocked(getCurrentActor).mockResolvedValueOnce(null);
    const response = await GET(new Request(`http://localhost/api/network/geographic?focus=${focus}`));
    expect(response.status).toBe(401);
    expect(getGeographicProjection).not.toHaveBeenCalled();
  });

  it("does not distinguish restricted coordinates from a missing focus", async () => {
    vi.mocked(getGeographicProjection).mockRejectedValueOnce({ code: "NOT_FOUND" });
    const response = await GET(new Request(`http://localhost/api/network/geographic?focus=${focus}`));
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Geographic investigation context not found.");
  });

  it("rejects a missing focus before projection access", async () => {
    const response = await GET(new Request("http://localhost/api/network/geographic"));
    expect(response.status).toBe(400);
    expect(getGeographicProjection).not.toHaveBeenCalled();
  });
});
