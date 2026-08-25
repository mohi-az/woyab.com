import { Router } from "express";

import { tagController } from "./tag.controller.js";

/**
 * Tag mutations intentionally live behind the authenticated Next.js admin
 * actions. The public Express surface is read-only.
 */
export const tagRouter = Router();

/**
 * @openapi
 * /tags:
 *   get:
 *     summary: List business tags
 *     tags: [Tags]
 *     parameters:
 *       - { in: query, name: locale, schema: { type: string, enum: [de, en, fa], default: de } }
 *     responses:
 *       200: { description: Tag list }
 */
tagRouter.get("/", tagController.list);
/**
 * @openapi
 * /tags/{id}:
 *   get:
 *     summary: Get a business tag
 *     tags: [Tags]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Tag }
 *       404: { description: Tag not found }
 */
tagRouter.get("/:id", tagController.getById);
