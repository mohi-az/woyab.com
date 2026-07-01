import { prisma } from "../../lib/prisma.js";
import type { CreateBusinessBody, UpdateBusinessBody } from "./business.schema.js";

type BusinessFilter = {
  categoryId?: number;
  subCategoryId?: number;
  cityId?: number;
  status?: "PENDING" | "ACTIVE" | "SUSPENDED" | "CLOSED" | "REJECTED";
  featured?: boolean;
  verified?: boolean;
  OR?: Array<{
    businessName?: { contains: string; mode: "insensitive" };
    shortDescription?: { contains: string; mode: "insensitive" };
  }>;
};

type BusinessSort = "latest";

export const businessRepository = {
  findMany: (skip: number, take: number, where: BusinessFilter = {}, sortBy?: BusinessSort) =>
    prisma.business.findMany({
      where,
      skip,
      take,
      orderBy: sortBy === "latest"
        ? [{ createdAt: "desc" }]
        : [{ featured: "desc" }, { averageRating: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        businessName: true,
        shortDescription: true,
        logoUrl: true,
        coverImageUrl: true,
        categoryId: true,
        category: { select: { id: true, nameFa: true, nameEn: true, slug: true, icon: true } },
        subCategoryId: true,
        subCategory: { select: { id: true, nameFa: true, nameEn: true, slug: true, icon: true } },
        cityId: true,
        city: { select: { id: true, nameFa: true, nameEn: true, slug: true } },
        status: true,
        verified: true,
        featured: true,
        averageRating: true,
        reviewCount: true,
        priceRange: true,
        createdAt: true,
        updatedAt: true,
      },
    }),

  count: (where: BusinessFilter = {}) => prisma.business.count({ where }),

  findManyByIds: (ids: string[]) =>
    prisma.business.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        slug: true,
        businessName: true,
        shortDescription: true,
        logoUrl: true,
        coverImageUrl: true,
        categoryId: true,
        category: { select: { id: true, nameFa: true, nameEn: true, slug: true, icon: true } },
        subCategoryId: true,
        subCategory: { select: { id: true, nameFa: true, nameEn: true, slug: true, icon: true } },
        cityId: true,
        city: { select: { id: true, nameFa: true, nameEn: true, slug: true } },
        status: true,
        verified: true,
        featured: true,
        averageRating: true,
        reviewCount: true,
        priceRange: true,
        createdAt: true,
        updatedAt: true,
      },
    }),

  findById: (id: string) =>
    prisma.business.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, nameFa: true, nameEn: true, slug: true, icon: true } },
        subCategory: { select: { id: true, nameFa: true, nameEn: true, slug: true, icon: true } },
        specialty: { select: { id: true, nameFa: true, nameEn: true } },
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        city: { select: { id: true, nameFa: true, nameEn: true, slug: true } },
        district: { select: { id: true, nameFa: true, nameEn: true } },
        businessHours: { orderBy: { dayOfWeek: "asc" } },
        tags: { include: { tag: { select: { id: true, nameFa: true, nameEn: true, slug: true } } } },
        images: { orderBy: { sortOrder: "asc" } },
        _count: { select: { reviews: true, services: true, branches: true } },
      },
    }),

  findBySlug: (slug: string) => prisma.business.findUnique({ where: { slug } }),

  create: (data: CreateBusinessBody) => prisma.business.create({ data }),

  update: (id: string, data: UpdateBusinessBody) =>
    prisma.business.update({ where: { id }, data }),

  delete: (id: string) => prisma.business.delete({ where: { id } }),
};
