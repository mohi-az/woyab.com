import type { Request, Response } from "express";

import {
  categoryIdParamsSchema,
  createCategoryBodySchema,
  createSpecialtyBodySchema,
  createSubCategoryBodySchema,
  listCategoriesQuerySchema,
  listSpecialtiesQuerySchema,
  listSubCategoriesQuerySchema,
  specialtyIdParamsSchema,
  subCategoryIdParamsSchema,
  updateCategoryBodySchema,
  updateSpecialtyBodySchema,
  updateSubCategoryBodySchema,
} from "./category.schema.js";
import { categoryService, specialtyService, subCategoryService } from "./category.service.js";

// ─── Category Controllers ────────────────────────────────────────────────────

export const categoryController = {
  list: async (req: Request, res: Response) => {
    const query = listCategoriesQuerySchema.parse(req.query);
    const result = await categoryService.list(query);
    res.json({ success: true, data: result });
  },

  getById: async (req: Request, res: Response) => {
    const { id } = categoryIdParamsSchema.parse(req.params);
    const category = await categoryService.getById(id);
    res.json({ success: true, data: category });
  },

  create: async (req: Request, res: Response) => {
    const body = createCategoryBodySchema.parse(req.body);
    const category = await categoryService.create(body);
    res.status(201).json({ success: true, data: category });
  },

  update: async (req: Request, res: Response) => {
    const { id } = categoryIdParamsSchema.parse(req.params);
    const body = updateCategoryBodySchema.parse(req.body);
    const category = await categoryService.update(id, body);
    res.json({ success: true, data: category });
  },

  delete: async (req: Request, res: Response) => {
    const { id } = categoryIdParamsSchema.parse(req.params);
    await categoryService.delete(id);
    res.status(204).send();
  },
};

// ─── SubCategory Controllers ─────────────────────────────────────────────────

export const subCategoryController = {
  list: async (req: Request, res: Response) => {
    const query = listSubCategoriesQuerySchema.parse(req.query);
    const result = await subCategoryService.list(query);
    res.json({ success: true, data: result });
  },

  getById: async (req: Request, res: Response) => {
    const { id } = subCategoryIdParamsSchema.parse(req.params);
    const subCategory = await subCategoryService.getById(id);
    res.json({ success: true, data: subCategory });
  },

  create: async (req: Request, res: Response) => {
    const body = createSubCategoryBodySchema.parse(req.body);
    const subCategory = await subCategoryService.create(body);
    res.status(201).json({ success: true, data: subCategory });
  },

  update: async (req: Request, res: Response) => {
    const { id } = subCategoryIdParamsSchema.parse(req.params);
    const body = updateSubCategoryBodySchema.parse(req.body);
    const subCategory = await subCategoryService.update(id, body);
    res.json({ success: true, data: subCategory });
  },

  delete: async (req: Request, res: Response) => {
    const { id } = subCategoryIdParamsSchema.parse(req.params);
    await subCategoryService.delete(id);
    res.status(204).send();
  },
};

// ─── Specialty Controllers ───────────────────────────────────────────────────

export const specialtyController = {
  list: async (req: Request, res: Response) => {
    const query = listSpecialtiesQuerySchema.parse(req.query);
    const result = await specialtyService.list(query);
    res.json({ success: true, data: result });
  },

  getById: async (req: Request, res: Response) => {
    const { id } = specialtyIdParamsSchema.parse(req.params);
    const specialty = await specialtyService.getById(id);
    res.json({ success: true, data: specialty });
  },

  create: async (req: Request, res: Response) => {
    const body = createSpecialtyBodySchema.parse(req.body);
    const specialty = await specialtyService.create(body);
    res.status(201).json({ success: true, data: specialty });
  },

  update: async (req: Request, res: Response) => {
    const { id } = specialtyIdParamsSchema.parse(req.params);
    const body = updateSpecialtyBodySchema.parse(req.body);
    const specialty = await specialtyService.update(id, body);
    res.json({ success: true, data: specialty });
  },

  delete: async (req: Request, res: Response) => {
    const { id } = specialtyIdParamsSchema.parse(req.params);
    await specialtyService.delete(id);
    res.status(204).send();
  },
};
