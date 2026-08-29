import { prisma } from "../../lib/prisma.js";
import type {
  CreateCategoryBody,
  CreateSubCategoryBody,
  UpdateCategoryBody,
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
      include: { _count: { select: { subCategories: true, businesses: { where: { status: "ACTIVE", verified: true, removedAt: null } } } } },
    }),

  count: (where: { active?: boolean } = {}) => prisma.category.count({ where }),

  findById: (id: number) =>
    prisma.category.findUnique({
      where: { id },
      include: {
        subCategories: { orderBy: { sortOrder: "asc" } },
        _count: { select: { businesses: { where: { status: "ACTIVE", verified: true, removedAt: null } } } },
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
        category: { select: { id: true, nameFa: true, nameEn: true, nameDe: true, slug: true } },
        _count: { select: { businesses: { where: { status: "ACTIVE", verified: true, removedAt: null } } } },
      },
    }),

  count: (where: { categoryId?: number; active?: boolean } = {}) =>
    prisma.subCategory.count({ where }),

  findById: (id: number) =>
    prisma.subCategory.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, nameFa: true, nameEn: true, nameDe: true, slug: true } },
        _count: { select: { businesses: { where: { status: "ACTIVE", verified: true, removedAt: null } } } },
      },
    }),

  findBySlug: (slug: string) => prisma.subCategory.findUnique({ where: { slug } }),

  create: (data: CreateSubCategoryBody) => prisma.subCategory.create({ data }),

  update: (id: number, data: UpdateSubCategoryBody) =>
    prisma.subCategory.update({ where: { id }, data }),

  delete: (id: number) => prisma.subCategory.delete({ where: { id } }),
};
