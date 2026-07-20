import type { RequestHandler } from "express";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 20_000;

function pruneExpiredBuckets(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(options: {
  keyPrefix: string;
  limit: number;
  windowMs: number;
}): RequestHandler {
  return (req, res, next) => {
    const now = Date.now();
    pruneExpiredBuckets(now);
    const key = `${options.keyPrefix}:${req.ip || req.socket.remoteAddress || "unknown"}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      if (!current && buckets.size >= MAX_BUCKETS) {
        res.setHeader("Retry-After", "60");
        res.status(429).json({
          success: false,
          error: "Too many requests. Please try again later.",
        });
        return;
      }
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      res.setHeader("RateLimit-Limit", String(options.limit));
      res.setHeader("RateLimit-Remaining", String(options.limit - 1));
      next();
      return;
    }

    current.count += 1;
    const remaining = Math.max(0, options.limit - current.count);
    res.setHeader("RateLimit-Limit", String(options.limit));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));

    if (current.count > options.limit) {
      res.setHeader("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
      res.status(429).json({
        success: false,
        error: "Too many requests. Please try again later.",
      });
      return;
    }

    next();
  };
}
