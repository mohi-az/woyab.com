import "server-only";

import type { Prisma } from "@woyab/database";
import type { AppLocale } from "@/i18n/config";
import type { BusinessDirectoryFilterOptions } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export type BusinessDirectoryOptionFilters = {
  categoryId?: number;
  subCategoryId?: number;
  tagIds?: number[];
  cityId?: number;
};

const publicBusinessWhere = {
  status: "ACTIVE",
  verified: true,
  removedAt: null,
} satisfies Prisma.BusinessWhereInput;

function localizedName(locale: AppLocale, nameFa: string, nameEn: string | null) {
  return locale === "fa" ? nameFa : nameEn || nameFa;
}

function tagCondition(tagIds?: number[]): Prisma.BusinessWhereInput {
  return tagIds?.length ? { tags: { some: { tagId: { in: tagIds } } } } : {};
}

export async function fetchBusinessDirectoryOptions(
  locale: AppLocale,
  filters: BusinessDirectoryOptionFilters = {},
): Promise<BusinessDirectoryFilterOptions> {
  const categoryBusinessWhere: Prisma.BusinessWhereInput = {
    ...publicBusinessWhere,
    ...(filters.cityId && { cityId: filters.cityId }),
    ...tagCondition(filters.tagIds),
  };
  const subCategoryBusinessWhere: Prisma.BusinessWhereInput = {
    ...publicBusinessWhere,
    ...(filters.cityId && { cityId: filters.cityId }),
    ...tagCondition(filters.tagIds),
  };
  const tagBusinessWhere: Prisma.BusinessWhereInput = {
    ...publicBusinessWhere,
    ...(filters.categoryId && { categoryId: filters.categoryId }),
    ...(filters.subCategoryId && { subCategoryId: filters.subCategoryId }),
    ...(filters.cityId && { cityId: filters.cityId }),
  };
  const cityBusinessWhere: Prisma.BusinessWhereInput = {
    ...publicBusinessWhere,
    ...(filters.categoryId && { categoryId: filters.categoryId }),
    ...(filters.subCategoryId && { subCategoryId: filters.subCategoryId }),
    ...tagCondition(filters.tagIds),
  };

  const [categories, subCategories, tags, cities] = await Promise.all([
    prisma.category.findMany({
      where: {
        active: true,
        OR: [
          { businesses: { some: categoryBusinessWhere } },
          ...(filters.categoryId ? [{ id: filters.categoryId }] : []),
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      select: {
        id: true,
        slug: true,
        nameFa: true,
        nameEn: true,
        icon: true,
        _count: { select: { businesses: { where: categoryBusinessWhere } } },
      },
    }),
    prisma.subCategory.findMany({
      where: {
        active: true,
        ...(filters.categoryId && { categoryId: filters.categoryId }),
        OR: [
          { businesses: { some: subCategoryBusinessWhere } },
          ...(filters.subCategoryId ? [{ id: filters.subCategoryId }] : []),
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      select: {
        id: true,
        slug: true,
        nameFa: true,
        nameEn: true,
        icon: true,
        categoryId: true,
        _count: { select: { businesses: { where: subCategoryBusinessWhere } } },
      },
    }),
    prisma.tag.findMany({
      where: {
        OR: [
          { businesses: { some: { business: tagBusinessWhere } } },
          ...(filters.tagIds?.length ? [{ id: { in: filters.tagIds } }] : []),
        ],
      },
      orderBy: [{ nameFa: "asc" }, { id: "asc" }],
      select: {
        id: true,
        slug: true,
        nameFa: true,
        nameEn: true,
        _count: { select: { businesses: { where: { business: tagBusinessWhere } } } },
      },
    }),
    prisma.city.findMany({
      where: {
        OR: [
          { businesses: { some: cityBusinessWhere } },
          ...(filters.cityId ? [{ id: filters.cityId }] : []),
        ],
      },
      orderBy: { nameEn: "asc" },
      select: {
        id: true,
        slug: true,
        nameFa: true,
        nameEn: true,
        latitude: true,
        longitude: true,
        _count: { select: { businesses: { where: cityBusinessWhere } } },
      },
    }),
  ]);

  return {
    categories: categories.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: localizedName(locale, item.nameFa, item.nameEn),
      iconKey: item.icon,
      count: item._count.businesses,
    })),
    subCategories: subCategories.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: localizedName(locale, item.nameFa, item.nameEn),
      iconKey: item.icon,
      parentId: item.categoryId,
      count: item._count.businesses,
    })),
    tags: tags.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: localizedName(locale, item.nameFa, item.nameEn),
      count: item._count.businesses,
    })),
    cities: cities.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: localizedName(locale, item.nameFa, item.nameEn),
      latitude: item.latitude,
      longitude: item.longitude,
      count: item._count.businesses,
    })),
  };
}
