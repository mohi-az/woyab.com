import { Router } from "express";

import { categoryController, specialtyController, subCategoryController } from "./category.controller.js";

/**
 * Taxonomy mutations intentionally live behind the authenticated Next.js admin
 * actions. The public Express surface is read-only.
 */
export const categoryRouter = Router();
export const subCategoryRouter = Router();
export const specialtyRouter = Router();

/**
 * @openapi
 * /categories:
 *   get:
 *     summary: List categories
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: locale
 *         schema: { type: string, enum: [de, en, fa], default: de }
 *     responses:
 *       200: { description: Category list }
 */
categoryRouter.get("/", categoryController.list);
/**
 * @openapi
 * /categories/{id}:
 *   get:
 *     summary: Get a category
 *     tags: [Categories]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Category }
 *       404: { description: Category not found }
 */
categoryRouter.get("/:id", categoryController.getById);

/**
 * @openapi
 * /sub-categories:
 *   get:
 *     summary: List sub-categories
 *     tags: [Categories]
 *     parameters:
 *       - { in: query, name: categoryId, schema: { type: integer } }
 *       - { in: query, name: locale, schema: { type: string, enum: [de, en, fa], default: de } }
 *     responses:
 *       200: { description: Sub-category list }
 */
subCategoryRouter.get("/", subCategoryController.list);
/**
 * @openapi
 * /sub-categories/{id}:
 *   get:
 *     summary: Get a sub-category
 *     tags: [Categories]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Sub-category }
 *       404: { description: Sub-category not found }
 */
subCategoryRouter.get("/:id", subCategoryController.getById);

/**
 * @openapi
 * /specialties:
 *   get:
 *     summary: List specialties
 *     tags: [Categories]
 *     parameters:
 *       - { in: query, name: subCategoryId, schema: { type: integer } }
 *       - { in: query, name: locale, schema: { type: string, enum: [de, en, fa], default: de } }
 *     responses:
 *       200: { description: Specialty list }
 */
specialtyRouter.get("/", specialtyController.list);
/**
 * @openapi
 * /specialties/{id}:
 *   get:
 *     summary: Get a specialty
 *     tags: [Categories]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Specialty }
 *       404: { description: Specialty not found }
 */
specialtyRouter.get("/:id", specialtyController.getById);
