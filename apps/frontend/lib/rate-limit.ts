type Bucket = { count: number; resetAt: number };

const globalForRateLimit = globalThis as unknown as { authRateLimits?: Map<string, Bucket> };
const buckets = globalForRateLimit.authRateLimits ?? new Map<string, Bucket>();
if (process.env.NODE_ENV !== "production") globalForRateLimit.authRateLimits = buckets;

export function isRateLimited(key: string, limit = 8, windowMs = 15 * 60_000) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  current.count += 1;
  return current.count > limit;
}

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
