import { Router } from "express";

import { reviewController } from "./review.controller.js";

export const reviewRouter = Router({ mergeParams: true });
export const reviewStandaloneRouter = Router();

/**
 * @openapi
 * /businesses/{businessId}/reviews:
 *   get:
 *     summary: List reviews for a business
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of reviews
 */
reviewRouter.get("/", reviewController.list);

/**
 * @openapi
 * /reviews/{id}:
 *   get:
 *     summary: Get a review by ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Review object
 *       404:
 *         description: Review not found
 */
reviewStandaloneRouter.get("/:id", reviewController.getById);
