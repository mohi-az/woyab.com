import { z } from "zod";

import { paginationQuerySchema } from "@woyab/shared";

// ─── Category ───────────────────────────────────────────────────────────────

export const createCategoryBodySchema = z.object({
  nameFa: z.string().min(1),
  nameEn: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  icon: z.string().optional(),
  image: z.string().optional(),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const updateCategoryBodySchema = createCategoryBodySchema.partial();

export const categoryIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listCategoriesQuerySchema = paginationQuerySchema.extend({
  active: z.enum(["true", "false"]).optional(),
});

// ─── SubCategory ────────────────────────────────────────────────────────────

export const createSubCategoryBodySchema = z.object({
  nameFa: z.string().min(1),
  nameEn: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  icon: z.string().optional(),
  image: z.string().optional(),
  categoryId: z.number().int().positive(),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const updateSubCategoryBodySchema = createSubCategoryBodySchema.partial();

export const subCategoryIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listSubCategoriesQuerySchema = paginationQuerySchema.extend({
  categoryId: z.coerce.number().int().positive().optional(),
  active: z.enum(["true", "false"]).optional(),
});


// ─── Types ──────────────────────────────────────────────────────────────────

export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategoryBodySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;

export type CreateSubCategoryBody = z.infer<typeof createSubCategoryBodySchema>;
export type UpdateSubCategoryBody = z.infer<typeof updateSubCategoryBodySchema>;
export type ListSubCategoriesQuery = z.infer<typeof listSubCategoriesQuerySchema>;
