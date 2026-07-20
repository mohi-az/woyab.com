import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

import { env } from "../config/env.js";

const INTERNAL_SECRET_HEADER = "x-fargo-internal-secret";

function secretsMatch(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length
    && timingSafeEqual(providedBuffer, expectedBuffer);
}

/**
 * Protects endpoints that may spend third-party API quota. These endpoints may
 * only be reached through the authenticated frontend proxy.
 */
export const requireInternalApi: RequestHandler = (req, res, next) => {
  const expected = env.INTERNAL_API_SECRET;
  if (!expected) {
    res.status(503).json({
      success: false,
      error: "Costly integration is not configured",
    });
    return;
  }

  const provided = req.get(INTERNAL_SECRET_HEADER) ?? "";
  if (!secretsMatch(provided, expected)) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  next();
};
