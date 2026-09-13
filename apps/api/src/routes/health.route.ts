import { Router } from "express";

import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

export const healthRouter = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Check API health
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: API is healthy
 */
healthRouter.get("/health", (_req, res) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.json({
    success: true,
    data: {
      name: env.APP_NAME,
      status: "ok",
      version: env.API_VERSION,
      revision: env.APP_REVISION ?? process.env.RAILWAY_GIT_COMMIT_SHA ?? null,
      timestamp: new Date().toISOString(),
    },
  });
});

// Liveness remains independent of Neon; readiness gates a release using real reads.
healthRouter.get("/ready", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      prisma.category.findFirst({ select: { id: true, nameDe: true, active: true } }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Readiness timeout")), 7_000);
      }),
    ]);
    res.json({ status: "ok", service: "api", revision: env.APP_REVISION ?? null });
  } catch {
    res.status(503).json({ status: "unavailable", service: "api" });
  } finally {
    clearTimeout(timer);
  }
});
