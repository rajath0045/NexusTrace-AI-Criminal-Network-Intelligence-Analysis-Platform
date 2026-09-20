import { afterEach, describe, expect, it } from "vitest";
import { resetRateLimitsForTests, takeRateLimit } from "./rate-limit";

describe("rate limiting", () => {
  afterEach(resetRateLimitsForTests);

  it("bounds an identity within its window and permits a later window", () => {
    for (let index = 0; index < 12; index += 1) takeRateLimit("login", "user", 1_000);
    expect(() => takeRateLimit("login", "user", 1_000)).toThrow("Too many requests");
    expect(() => takeRateLimit("login", "user", 1_000 + 15 * 60_000)).not.toThrow();
  });
});
