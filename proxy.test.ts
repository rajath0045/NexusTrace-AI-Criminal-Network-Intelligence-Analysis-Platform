import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./src/proxy";

describe("request proxy", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("denies a cross-origin API mutation", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", "https://nexustrace.example.gov");
    const response = proxy(new NextRequest("https://nexustrace.example.gov/api/reports", { method: "POST", headers: { origin: "https://attacker.example" } }));
    expect(response.status).toBe(403);
  });

  it("emits a nonce CSP and restrictive security headers", () => {
    const response = proxy(new NextRequest("http://localhost:3000/reports"));
    expect(response.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("Content-Security-Policy")).toContain("worker-src 'self' blob:");
  });

  it("emits HSTS only for HTTPS production requests", () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = proxy(new NextRequest("https://nexustrace.example.gov/login"));
    expect(response.headers.get("Strict-Transport-Security")).toContain("max-age=31536000");
  });

  it("keeps unsafe eval out of production CSP", () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = proxy(new NextRequest("https://nexustrace.example.gov/login"));
    expect(response.headers.get("Content-Security-Policy")).not.toContain("unsafe-eval");
  });
});
