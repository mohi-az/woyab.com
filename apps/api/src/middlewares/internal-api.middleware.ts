import { timingSafeEqual } from "node:crypto";
import type { Request, RequestHandler } from "express";

import { env } from "../config/env.js";

const INTERNAL_SECRET_HEADER = "x-woyab-internal-secret";

function secretsMatch(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length
    && timingSafeEqual(providedBuffer, expectedBuffer);
}

export function isInternalApiRequest(req: Request) {
  const expected = env.INTERNAL_API_SECRET;
  if (!expected) return false;
  return secretsMatch(req.get(INTERNAL_SECRET_HEADER) ?? "", expected);
}

/**
 * Protects endpoints that may spend third-party API quota. These endpoints may
 * only be reached through the authenticated frontend proxy.
 */
export const requireInternalApi: RequestHandler = (req, res, next) => {
  if (!env.INTERNAL_API_SECRET) {
    res.status(503).json({
      success: false,
      error: "Costly integration is not configured",
    });
    return;
  }

  if (!isInternalApiRequest(req)) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  next();
};
