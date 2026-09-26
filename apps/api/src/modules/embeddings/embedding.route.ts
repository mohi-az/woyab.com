import { Router } from "express";
import asyncHandler from "express-async-handler";
import { requireInternalApi } from "../../middlewares/internal-api.middleware.js";
import { embeddingController } from "./embedding.controller.js";

export const embeddingRouter = Router();

/**
 * Public Semantic Search endpoint.
 * Accepts a search query along with optional facet filters and returns
 * businesses ranked by cosine similarity.
 */
embeddingRouter.post("/", asyncHandler(embeddingController.search));
embeddingRouter.post("/search", asyncHandler(embeddingController.search));

/**
 * Admin protected routes requiring internal API secret.
 */
embeddingRouter.get("/stats", requireInternalApi, asyncHandler(embeddingController.getStats));
embeddingRouter.post("/index/:id", requireInternalApi, asyncHandler(embeddingController.reindexSingle));
embeddingRouter.post("/test", requireInternalApi, asyncHandler(embeddingController.testSearch));
embeddingRouter.get("/sync-status", requireInternalApi, asyncHandler(embeddingController.getSyncStatus));
