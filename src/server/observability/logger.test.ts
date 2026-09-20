import { describe, expect, it, vi } from "vitest";
import { operationalLog } from "./logger";

describe("operational logging", () => {
  it("redacts credentials from error context", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    operationalLog.error("database.failure", { message: "postgresql://operator:password@db/private", password: "also-private" });
    const entry = String(spy.mock.calls[0]?.[0]);
    expect(entry).not.toContain("postgresql://");
    expect(entry).not.toContain("also-private");
    spy.mockRestore();
  });
});
