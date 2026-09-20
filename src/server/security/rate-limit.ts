import { RateLimitError } from "@/domain/errors";

type Bucket = { count: number; resetAt: number };
type Limit = { max: number; windowMs: number };

const limits: Record<string, Limit> = {
  login: { max: 12, windowMs: 15 * 60_000 },
  search: { max: 90, windowMs: 60_000 },
  report: { max: 12, windowMs: 60_000 },
  evidence: { max: 20, windowMs: 60_000 },
  investigation: { max: 30, windowMs: 60_000 },
};
const buckets = new Map<string, Bucket>();

export function takeRateLimit(kind: keyof typeof limits, identifier: string, now = Date.now()): void {
  const limit = limits[kind];
  const key = `${kind}:${identifier}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + limit.windowMs });
    return;
  }
  if (current.count >= limit.max) throw new RateLimitError();
  current.count += 1;
}

export function resetRateLimitsForTests(): void {
  buckets.clear();
}
