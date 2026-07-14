import { Router } from "express";

import { serviceController } from "./service.controller.js";

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
