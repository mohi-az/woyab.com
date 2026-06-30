import { Router } from "express";

import { validateRequest } from "../../validation/validate-request.js";
import { reviewController } from "./review.controller.js";
import { createReviewBodySchema, updateReviewBodySchema } from "./review.schema.js";

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
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, APPROVED, REJECTED] }
 *     responses:
 *       200:
 *         description: Paginated list of reviews
 */
reviewRouter.get("/", reviewController.list);

/**
 * @openapi
 * /businesses/{businessId}/reviews:
 *   post:
 *     summary: Create a review for a business
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, rating]
 *             properties:
 *               userId: { type: string }
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               title: { type: string }
 *               comment: { type: string }
 *     responses:
 *       201:
 *         description: Review created
 *       409:
 *         description: User already reviewed this business
 */
reviewRouter.post("/", validateRequest({ body: createReviewBodySchema }), reviewController.create);

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

/**
 * @openapi
 * /reviews/{id}:
 *   patch:
 *     summary: Update a review
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               title: { type: string, maxLength: 200 }
 *               comment: { type: string, maxLength: 2000 }
 *               visitDate: { type: string, format: date-time }
 *               status: { type: string, enum: [PENDING, APPROVED, REJECTED] }
 *               verified: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated review
 *       404:
 *         description: Review not found
 */
reviewStandaloneRouter.patch("/:id", validateRequest({ body: updateReviewBodySchema }), reviewController.update);

/**
 * @openapi
 * /reviews/{id}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Review deleted
 */
reviewStandaloneRouter.delete("/:id", reviewController.delete);
