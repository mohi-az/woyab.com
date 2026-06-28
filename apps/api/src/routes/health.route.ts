import { Router } from "express";

import { env } from "../config/env.js";

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
  res.json({
    success: true,
    data: {
      name: env.APP_NAME,
      status: "ok",
      version: env.API_VERSION,
      timestamp: new Date().toISOString(),
    },
  });
});
