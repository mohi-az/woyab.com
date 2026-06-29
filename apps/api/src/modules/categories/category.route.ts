import { Router } from "express";

import { validateRequest } from "../../validation/validate-request.js";
import { categoryController, specialtyController, subCategoryController } from "./category.controller.js";
import {
  createCategoryBodySchema,
  createSpecialtyBodySchema,
  createSubCategoryBodySchema,
  updateCategoryBodySchema,
  updateSpecialtyBodySchema,
  updateSubCategoryBodySchema,
} from "./category.schema.js";

export const categoryRouter = Router();
export const subCategoryRouter = Router();
export const specialtyRouter = Router();

// ─── Category Routes ─────────────────────────────────────────────────────────

/**
 * @openapi
 * /categories:
 *   get:
 *     summary: List all categories
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: active
 *         schema: { type: string, enum: [true, false] }
 *     responses:
 *       200:
 *         description: Paginated list of categories
 */
categoryRouter.get("/", categoryController.list);

/**
 * @openapi
 * /categories/{id}:
 *   get:
 *     summary: Get a category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Category with sub-categories
 *       404:
 *         description: Category not found
 */
categoryRouter.get("/:id", categoryController.getById);

/**
 * @openapi
 * /categories:
 *   post:
 *     summary: Create a category
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nameFa, nameEn, slug]
 *             properties:
 *               nameFa: { type: string }
 *               nameEn: { type: string }
 *               slug: { type: string }
 *               icon: { type: string }
 *               image: { type: string }
 *               sortOrder: { type: integer }
 *               active: { type: boolean }
 *     responses:
 *       201:
 *         description: Category created
 *       409:
 *         description: Slug already exists
 */
categoryRouter.post("/", validateRequest({ body: createCategoryBodySchema }), categoryController.create);

/**
 * @openapi
 * /categories/{id}:
 *   patch:
 *     summary: Update a category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Updated category
 *       404:
 *         description: Category not found
 */
categoryRouter.patch("/:id", validateRequest({ body: updateCategoryBodySchema }), categoryController.update);

/**
 * @openapi
 * /categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Category deleted
 *       404:
 *         description: Category not found
 */
categoryRouter.delete("/:id", categoryController.delete);

// ─── SubCategory Routes ───────────────────────────────────────────────────────

/**
 * @openapi
 * /sub-categories:
 *   get:
 *     summary: List all sub-categories
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema: { type: integer }
 *       - in: query
 *         name: active
 *         schema: { type: string, enum: [true, false] }
 *     responses:
 *       200:
 *         description: Paginated list of sub-categories
 */
subCategoryRouter.get("/", subCategoryController.list);
subCategoryRouter.get("/:id", subCategoryController.getById);
subCategoryRouter.post("/", validateRequest({ body: createSubCategoryBodySchema }), subCategoryController.create);
subCategoryRouter.patch("/:id", validateRequest({ body: updateSubCategoryBodySchema }), subCategoryController.update);
subCategoryRouter.delete("/:id", subCategoryController.delete);

// ─── Specialty Routes ─────────────────────────────────────────────────────────

/**
 * @openapi
 * /specialties:
 *   get:
 *     summary: List all specialties
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: subCategoryId
 *         schema: { type: integer }
 *       - in: query
 *         name: active
 *         schema: { type: string, enum: [true, false] }
 *     responses:
 *       200:
 *         description: Paginated list of specialties
 */
specialtyRouter.get("/", specialtyController.list);
specialtyRouter.get("/:id", specialtyController.getById);
specialtyRouter.post("/", validateRequest({ body: createSpecialtyBodySchema }), specialtyController.create);
specialtyRouter.patch("/:id", validateRequest({ body: updateSpecialtyBodySchema }), specialtyController.update);
specialtyRouter.delete("/:id", specialtyController.delete);
