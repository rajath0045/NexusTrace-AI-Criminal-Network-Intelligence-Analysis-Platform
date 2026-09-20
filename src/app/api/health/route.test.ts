import { describe, expect, it, vi } from "vitest";

const queryRaw = vi.fn();
vi.mock("@/server/db/client", () => ({ prisma: { $queryRaw: queryRaw } }));
const { GET } = await import("./route");

describe("health endpoint", () => {
  it("reports only safe readiness information", async () => {
    queryRaw.mockResolvedValueOnce([{ ok: 1 }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ application: "ok", database: "ok" }));
  });

  it("does not disclose database failures", async () => {
    queryRaw.mockRejectedValueOnce(new Error("postgresql://secret@db/private"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("postgresql://");
  });
});
