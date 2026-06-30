import { Router } from "express";

import { validateRequest } from "../../validation/validate-request.js";
import { tagController } from "./tag.controller.js";
import { createTagBodySchema, updateTagBodySchema } from "./tag.schema.js";

export const tagRouter = Router();

/**
 * @openapi
 * /tags:
 *   get:
 *     summary: List all tags
 *     tags: [Tags]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of tags
 */
tagRouter.get("/", tagController.list);

/**
 * @openapi
 * /tags/{id}:
 *   get:
 *     summary: Get a tag by ID
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Tag object
 *       404:
 *         description: Tag not found
 */
tagRouter.get("/:id", tagController.getById);

/**
 * @openapi
 * /tags:
 *   post:
 *     summary: Create a tag
 *     tags: [Tags]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nameFa, slug]
 *             properties:
 *               nameFa: { type: string }
 *               nameEn: { type: string }
 *               slug: { type: string }
 *     responses:
 *       201:
 *         description: Tag created
 *       409:
 *         description: Tag already exists
 */
tagRouter.post("/", validateRequest({ body: createTagBodySchema }), tagController.create);

/**
 * @openapi
 * /tags/{id}:
 *   patch:
 *     summary: Update a tag
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nameFa: { type: string }
 *               nameEn: { type: string }
 *               slug: { type: string }
 *     responses:
 *       200:
 *         description: Updated tag
 *       404:
 *         description: Tag not found
 */
tagRouter.patch("/:id", validateRequest({ body: updateTagBodySchema }), tagController.update);

/**
 * @openapi
 * /tags/{id}:
 *   delete:
 *     summary: Delete a tag
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Tag deleted
 */
tagRouter.delete("/:id", tagController.delete);
