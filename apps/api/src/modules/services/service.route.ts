import { Router } from "express";

import { validateRequest } from "../../validation/validate-request.js";
import { serviceController } from "./service.controller.js";
import { createServiceBodySchema, updateServiceBodySchema } from "./service.schema.js";

export const serviceRouter = Router({ mergeParams: true });

/**
 * @openapi
 * /businesses/{businessId}/services:
 *   get:
 *     summary: List services for a business
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: active
 *         schema: { type: string, enum: [true, false] }
 *     responses:
 *       200:
 *         description: Paginated list of services
 */
serviceRouter.get("/", serviceController.list);

/**
 * @openapi
 * /businesses/{businessId}/services/{id}:
 *   get:
 *     summary: Get a service by ID
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Service object
 *       404:
 *         description: Service not found
 */
serviceRouter.get("/:id", serviceController.getById);

/**
 * @openapi
 * /businesses/{businessId}/services:
 *   post:
 *     summary: Create a service for a business
 *     tags: [Services]
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
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               currency: { type: string }
 *               duration: { type: integer }
 *     responses:
 *       201:
 *         description: Service created
 */
serviceRouter.post("/", validateRequest({ body: createServiceBodySchema }), serviceController.create);

/**
 * @openapi
 * /businesses/{businessId}/services/{id}:
 *   patch:
 *     summary: Update a service
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema: { type: string }
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
 *               title: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               currency: { type: string, minLength: 3, maxLength: 3 }
 *               duration: { type: integer }
 *               unit: { type: string }
 *               active: { type: boolean }
 *               sortOrder: { type: integer }
 *     responses:
 *       200:
 *         description: Updated service
 *       404:
 *         description: Service not found
 */
serviceRouter.patch("/:id", validateRequest({ body: updateServiceBodySchema }), serviceController.update);

/**
 * @openapi
 * /businesses/{businessId}/services/{id}:
 *   delete:
 *     summary: Delete a service
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Service deleted
 */
serviceRouter.delete("/:id", serviceController.delete);
