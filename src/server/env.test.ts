import { describe, expect, it } from "vitest";
import { assertProductionEnvironment } from "./env";

const base: NodeJS.ProcessEnv = { NODE_ENV: "test", DATABASE_URL: "postgresql://user:password@localhost:5432/nexustrace", EVIDENCE_STORAGE_ROOT: "/var/lib/nexustrace/evidence" };

describe("production environment validation", () => {
  it("requires an application origin in production", () => {
    expect(() => assertProductionEnvironment({ ...base, NODE_ENV: "production" })).toThrow("APP_ORIGIN");
  });

  it("requires HTTPS outside localhost", () => {
    expect(() => assertProductionEnvironment({ ...base, NODE_ENV: "production", APP_ORIGIN: "http://nexustrace.example.gov" })).toThrow("HTTPS");
  });

  it("accepts a local production smoke-test origin", () => {
    expect(assertProductionEnvironment({ ...base, NODE_ENV: "production", APP_ORIGIN: "http://localhost:3000" }).APP_ORIGIN).toBe("http://localhost:3000");
  });
});
