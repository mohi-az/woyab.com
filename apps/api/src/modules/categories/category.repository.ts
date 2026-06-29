import { prisma } from "../../lib/prisma.js";
import type {
  CreateCategoryBody,
  CreateSpecialtyBody,
  CreateSubCategoryBody,
  UpdateCategoryBody,
  UpdateSpecialtyBody,
  UpdateSubCategoryBody,
} from "./category.schema.js";

// ─── Category ───────────────────────────────────────────────────────────────

export const categoryRepository = {
  findMany: (skip: number, take: number, where: { active?: boolean } = {}) =>
    prisma.category.findMany({
      where,
      skip,
      take,
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { subCategories: true, businesses: true } } },
    }),

  count: (where: { active?: boolean } = {}) => prisma.category.count({ where }),

  findById: (id: number) =>
    prisma.category.findUnique({
      where: { id },
      include: {
        subCategories: { orderBy: { sortOrder: "asc" } },
        _count: { select: { businesses: true } },
      },
    }),

  findBySlug: (slug: string) => prisma.category.findUnique({ where: { slug } }),

  create: (data: CreateCategoryBody) => prisma.category.create({ data }),

  update: (id: number, data: UpdateCategoryBody) =>
    prisma.category.update({ where: { id }, data }),

  delete: (id: number) => prisma.category.delete({ where: { id } }),
};

// ─── SubCategory ────────────────────────────────────────────────────────────

export const subCategoryRepository = {
  findMany: (skip: number, take: number, where: { categoryId?: number; active?: boolean } = {}) =>
    prisma.subCategory.findMany({
      where,
      skip,
      take,
      orderBy: { sortOrder: "asc" },
      include: {
        category: { select: { id: true, nameFa: true, nameEn: true, slug: true } },
        _count: { select: { specialties: true, businesses: true } },
      },
    }),

  count: (where: { categoryId?: number; active?: boolean } = {}) =>
    prisma.subCategory.count({ where }),

  findById: (id: number) =>
    prisma.subCategory.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, nameFa: true, nameEn: true, slug: true } },
        specialties: { orderBy: { sortOrder: "asc" } },
        _count: { select: { businesses: true } },
      },
    }),

  findBySlug: (slug: string) => prisma.subCategory.findUnique({ where: { slug } }),

  create: (data: CreateSubCategoryBody) => prisma.subCategory.create({ data }),

  update: (id: number, data: UpdateSubCategoryBody) =>
    prisma.subCategory.update({ where: { id }, data }),

  delete: (id: number) => prisma.subCategory.delete({ where: { id } }),
};

// ─── Specialty ──────────────────────────────────────────────────────────────

export const specialtyRepository = {
  findMany: (skip: number, take: number, where: { subCategoryId?: number; active?: boolean } = {}) =>
    prisma.specialty.findMany({
      where,
      skip,
      take,
      orderBy: { sortOrder: "asc" },
      include: {
        subCategory: { select: { id: true, nameFa: true, nameEn: true, slug: true } },
        _count: { select: { businesses: true } },
      },
    }),

  count: (where: { subCategoryId?: number; active?: boolean } = {}) =>
    prisma.specialty.count({ where }),

  findById: (id: number) =>
    prisma.specialty.findUnique({
      where: { id },
      include: {
        subCategory: { select: { id: true, nameFa: true, nameEn: true, slug: true } },
      },
    }),

  create: (data: CreateSpecialtyBody) => prisma.specialty.create({ data }),

  update: (id: number, data: UpdateSpecialtyBody) =>
    prisma.specialty.update({ where: { id }, data }),

  delete: (id: number) => prisma.specialty.delete({ where: { id } }),
};
