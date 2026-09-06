import "server-only";
import { cache } from "react";
import type { Prisma } from "@woyab/database";
import { prisma } from "@/lib/prisma";
import type { DirectoryTopic } from "@/lib/directory-seo";

export const directoryBusinessWhere = {
  status: "ACTIVE", verified: true, removedAt: null, category: { active: true },
  OR: [{ subCategoryId: null }, { subCategory: { active: true } }],
} satisfies Prisma.BusinessWhereInput;

// Only occupied taxonomy pages are published. City/service intersections need
// three listings; this is an editorial threshold, not a Google ranking rule.
export const getDirectoryTopics = cache(async (): Promise<DirectoryTopic[]> => {
  const [cities, categories, specialties, groups] = await Promise.all([
    prisma.city.findMany({ select: { id: true, slug: true, nameFa: true, nameEn: true }, orderBy: { nameEn: "asc" } }),
    prisma.category.findMany({ where: { active: true }, select: { id: true, slug: true, nameFa: true, nameEn: true, nameDe: true }, orderBy: { sortOrder: "asc" } }),
    prisma.subCategory.findMany({ where: { active: true, category: { active: true } }, select: { id: true, categoryId: true, slug: true, nameFa: true, nameEn: true, nameDe: true }, orderBy: { sortOrder: "asc" } }),
    prisma.business.groupBy({ by: ["cityId", "categoryId", "subCategoryId"], where: directoryBusinessWhere, _count: { _all: true } }),
  ]);
  const topics: DirectoryTopic[] = [];
  const counts = new Map<string, number>();
  const add = (key: string, amount: number) => counts.set(key, (counts.get(key) || 0) + amount);
  for (const row of groups) {
    add(`cities:${row.cityId}`, row._count._all);
    add(`categories:${row.categoryId}`, row._count._all);
    add(`categories:${row.categoryId}:${row.cityId}`, row._count._all);
    if (row.subCategoryId !== null) {
      add(`specialties:${row.subCategoryId}`, row._count._all);
      add(`specialties:${row.subCategoryId}:${row.cityId}`, row._count._all);
    }
  }
  for (const city of cities) {
    const total = counts.get(`cities:${city.id}`) || 0;
    if (total) topics.push({ ...city, kind: "cities", path: `/directory/cities/${encodeURIComponent(city.slug)}`, cityId: city.id, count: total });
  }
  for (const [kind, items] of [["categories", categories], ["specialties", specialties]] as const) {
    for (const item of items) {
      const total = counts.get(`${kind}:${item.id}`) || 0;
      if (!total) continue;
      const base = { ...item, kind, path: `/directory/${kind}/${encodeURIComponent(item.slug)}`, count: total,
        ...(kind === "categories" ? { categoryId: item.id } : { subCategoryId: item.id }),
      };
      topics.push(base);
      for (const city of cities) {
        const cityCount = counts.get(`${kind}:${item.id}:${city.id}`) || 0;
        if (cityCount >= 3) topics.push({ ...base, city, cityId: city.id, count: cityCount, path: `${base.path}/${encodeURIComponent(city.slug)}` });
      }
    }
  }
  return topics;
});

export const DIRECTORY_PAGE_SIZE = 9;

export const getDirectoryListings = cache(async (path: string, page: number) => {
  const topics = await getDirectoryTopics();
  const topic = topics.find((item) => item.path === path);
  if (!topic || page > Math.ceil(topic.count / DIRECTORY_PAGE_SIZE)) return null;
  const businesses = await prisma.business.findMany({
    where: { ...directoryBusinessWhere, cityId: topic.cityId, categoryId: topic.categoryId, subCategoryId: topic.subCategoryId },
    orderBy: [{ businessName: "asc" }, { id: "asc" }],
    skip: (page - 1) * DIRECTORY_PAGE_SIZE, take: DIRECTORY_PAGE_SIZE,
    select: {
      id: true, slug: true, businessName: true, sourceLocale: true, shortDescription: true,
      address: true, postalCode: true, phone: true, mobile: true,
      coverImageUrl: true, googlePlaceId: true, featured: true,
      averageRating: true, reviewCount: true, googleRating: true, googleUserRatingCount: true,
      businessHours: { select: { dayOfWeek: true, openTime: true, closeTime: true, isClosed: true } },
      city: { select: { nameFa: true, nameEn: true } },
      category: { select: { nameFa: true, nameEn: true, nameDe: true, slug: true, icon: true } },
      subCategory: { select: { nameFa: true, nameEn: true, nameDe: true, slug: true } },
      translations: { select: { locale: true, businessName: true, shortDescription: true, description: true } },
    },
  });
  return { topic, businesses };
});
