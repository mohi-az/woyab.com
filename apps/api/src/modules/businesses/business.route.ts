import { Router } from "express";

import { validateRequest } from "../../validation/validate-request.js";
import { businessController } from "./business.controller.js";
import { businessMapBodySchema, businessSearchBodySchema, createBusinessBodySchema, updateBusinessBodySchema } from "./business.schema.js";

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
 *         schema: { type: string, enum: [latest] }
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

businessRouter.post("/map", validateRequest({ body: businessMapBodySchema }), businessController.map);

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

/**
 * @openapi
 * /businesses:
 *   post:
 *     summary: Create a new business
 *     tags: [Businesses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [slug, businessName, categoryId, cityId]
 *             properties:
 *               slug: { type: string }
 *               businessName: { type: string }
 *               categoryId: { type: integer }
 *               cityId: { type: integer }
 *     responses:
 *       201:
 *         description: Business created
 *       409:
 *         description: Slug already exists
 */
businessRouter.post("/", validateRequest({ body: createBusinessBodySchema }), businessController.create);

/**
 * @openapi
 * /businesses/{id}:
 *   patch:
 *     summary: Update a business
 *     tags: [Businesses]
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
 *               slug: { type: string }
 *               businessName: { type: string }
 *               legalName: { type: string }
 *               shortDescription: { type: string, maxLength: 300 }
 *               description: { type: string }
 *               logoUrl: { type: string }
 *               coverImageUrl: { type: string }
 *               categoryId: { type: integer }
 *               subCategoryId: { type: integer }
 *               specialtyId: { type: integer }
 *               ownerId: { type: string }
 *               establishedYear: { type: integer, minimum: 1800 }
 *               priceRange: { type: string, enum: [BUDGET, MODERATE, EXPENSIVE, LUXURY] }
 *               phone: { type: string }
 *               mobile: { type: string }
 *               whatsapp: { type: string }
 *               email: { type: string }
 *               website: { type: string }
 *               instagram: { type: string }
 *               telegram: { type: string }
 *               facebook: { type: string }
 *               youtube: { type: string }
 *               linkedin: { type: string }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *               cityId: { type: integer }
 *               districtId: { type: integer }
 *               address: { type: string }
 *               postalCode: { type: string }
 *               status: { type: string, enum: [PENDING, ACTIVE, SUSPENDED, CLOSED, REJECTED] }
 *               verified: { type: boolean }
 *               featured: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated business
 *       404:
 *         description: Business not found
 */
businessRouter.patch("/:id", validateRequest({ body: updateBusinessBodySchema }), businessController.update);

/**
 * @openapi
 * /businesses/{id}:
 *   delete:
 *     summary: Delete a business
 *     tags: [Businesses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Business deleted
 *       404:
 *         description: Business not found
 */
businessRouter.delete("/:id", businessController.delete);
