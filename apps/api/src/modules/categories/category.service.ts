import { ApiError } from "../../errors/api-error.js";
import type {
  CreateCategoryBody,
  CreateSubCategoryBody,
  ListCategoriesQuery,
  ListSubCategoriesQuery,
  UpdateCategoryBody,
  UpdateSubCategoryBody,
} from "./category.schema.js";
import { categoryRepository, subCategoryRepository } from "./category.repository.js";

// ─── Category Service ────────────────────────────────────────────────────────

export const categoryService = {
  list: async (query: ListCategoriesQuery) => {
    const { page, limit, active } = query;
    const skip = (page - 1) * limit;
    const where = {
      ...(active !== undefined && { active: active === "true" }),
    };
    const [items, total] = await Promise.all([
      categoryRepository.findMany(skip, limit, where),
      categoryRepository.count(where),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  getById: async (id: number) => {
    const category = await categoryRepository.findById(id);
    if (!category) throw ApiError.notFound("Category not found");
    return category;
  },

  create: async (data: CreateCategoryBody) => {
    const existing = await categoryRepository.findBySlug(data.slug);
    if (existing) throw ApiError.conflict(`Category with slug "${data.slug}" already exists`);
    return categoryRepository.create(data);
  },

  update: async (id: number, data: UpdateCategoryBody) => {
    await categoryService.getById(id);
    if (data.slug) {
      const existing = await categoryRepository.findBySlug(data.slug);
      if (existing && existing.id !== id) throw ApiError.conflict(`Category with slug "${data.slug}" already exists`);
    }
    return categoryRepository.update(id, data);
  },

  delete: async (id: number) => {
    await categoryService.getById(id);
    return categoryRepository.delete(id);
  },
};

// ─── SubCategory Service ─────────────────────────────────────────────────────

export const subCategoryService = {
  list: async (query: ListSubCategoriesQuery) => {
    const { page, limit, categoryId, active } = query;
    const skip = (page - 1) * limit;
    const where = {
      ...(categoryId !== undefined && { categoryId }),
      ...(active !== undefined && { active: active === "true" }),
    };
    const [items, total] = await Promise.all([
      subCategoryRepository.findMany(skip, limit, where),
      subCategoryRepository.count(where),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  getById: async (id: number) => {
    const subCategory = await subCategoryRepository.findById(id);
    if (!subCategory) throw ApiError.notFound("Sub-category not found");
    return subCategory;
  },

  create: async (data: CreateSubCategoryBody) => {
    const existing = await subCategoryRepository.findBySlug(data.slug);
    if (existing) throw ApiError.conflict(`Sub-category with slug "${data.slug}" already exists`);
    return subCategoryRepository.create(data);
  },

  update: async (id: number, data: UpdateSubCategoryBody) => {
    await subCategoryService.getById(id);
    if (data.slug) {
      const existing = await subCategoryRepository.findBySlug(data.slug);
      if (existing && existing.id !== id) throw ApiError.conflict(`Sub-category with slug "${data.slug}" already exists`);
    }
    return subCategoryRepository.update(id, data);
  },

  delete: async (id: number) => {
    await subCategoryService.getById(id);
    return subCategoryRepository.delete(id);
  },
};
