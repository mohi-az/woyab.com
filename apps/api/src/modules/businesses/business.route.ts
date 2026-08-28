import { Router } from "express";

import { validateRequest } from "../../validation/validate-request.js";
import { businessController } from "./business.controller.js";
import { businessMapBodySchema, businessSearchBodySchema } from "./business.schema.js";

export const businessRouter = Router();

/**
 * @openapi
 * /businesses:
 *   get:
 *     summary: List all businesses
 *     tags: [Businesses]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: categoryId
 *         schema: { type: integer }
 *       - in: query
 *         name: cityId
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, ACTIVE, SUSPENDED, CLOSED, REJECTED] }
 *       - in: query
 *         name: featured
 *         schema: { type: string, enum: [true, false] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [latest, oldest, popular] }
 *     responses:
 *       200:
 *         description: Paginated list of businesses
 */
businessRouter.get("/", businessController.list);

/**
 * @openapi
 * /businesses/search:
 *   post:
 *     summary: Search businesses, optionally around a private origin
 *     tags: [Businesses]
 *     responses:
 *       200:
 *         description: Paginated businesses with nearest matching locations
 */
businessRouter.post("/search", validateRequest({ body: businessSearchBodySchema }), businessController.search);

/**
 * @openapi
 * /businesses/map:
 *   post:
 *     summary: Get businesses for a map viewport
 *     tags: [Businesses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [locale]
 *             properties:
 *               locale: { type: string, enum: [de, en, fa] }
 *               categoryId: { type: integer }
 *               subCategoryId: { type: integer }
 *               cityId: { type: integer }
 *               search: { type: string }
 *               origin:
 *                 type: object
 *                 properties:
 *                   latitude: { type: number }
 *                   longitude: { type: number }
 *               bounds:
 *                 type: object
 *                 properties:
 *                   west: { type: number }
 *                   south: { type: number }
 *                   east: { type: number }
 *                   north: { type: number }
 *     responses:
 *       200: { description: Map-ready business list }
 *       422: { description: Invalid map query }
 */
businessRouter.post("/map", validateRequest({ body: businessMapBodySchema }), businessController.map);

/**
 * @openapi
 * /businesses/slug/{slug}:
 *   get:
 *     summary: Get a business by slug
 *     tags: [Businesses]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Business with full details
 *       404:
 *         description: Business not found
 */
businessRouter.get("/slug/:slug", businessController.getBySlug);

/**
 * @openapi
 * /businesses/{id}:
 *   get:
 *     summary: Get a business by ID
 *     tags: [Businesses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Business with full details
 *       404:
 *         description: Business not found
 */
businessRouter.get("/:id", businessController.getById);
