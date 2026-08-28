import { prisma } from "../../lib/prisma.js";
import { businessTranslationSelect } from "./business-localization.js";

type BusinessFindManyArgs = NonNullable<Parameters<typeof prisma.business.findMany>[0]>;
type BusinessFilter = BusinessFindManyArgs["where"];
type BusinessCreateData = NonNullable<Parameters<typeof prisma.business.create>[0]>["data"];
type BusinessUpdateData = NonNullable<Parameters<typeof prisma.business.update>[0]>["data"];

type BusinessSort = "latest" | "oldest" | "popular";

const businessDetailInclude = {
  category: { select: { id: true, nameFa: true, nameEn: true, slug: true, icon: true } },
  subCategory: { select: { id: true, nameFa: true, nameEn: true, slug: true, icon: true } },
  specialty: { select: { id: true, nameFa: true, nameEn: true } },
  city: { select: { id: true, nameFa: true, nameEn: true, slug: true } },
  district: { select: { id: true, nameFa: true, nameEn: true } },
  businessHours: { orderBy: { dayOfWeek: "asc" as const } },
  attributes: {
    include: {
      attribute: {
        select: {
          id: true,
          key: true,
          labelFa: true,
          labelEn: true,
          labelDe: true,
          dataType: true,
          unit: true,
          options: true,
          sortOrder: true,
          active: true,
        },
      },
    },
    orderBy: { attribute: { sortOrder: "asc" as const } },
  },
  tags: { include: { tag: { select: { id: true, nameFa: true, nameEn: true, slug: true } } } },
  images: { orderBy: { sortOrder: "asc" as const } },
  translations: { select: businessTranslationSelect },
  _count: {
    select: {
      reviews: { where: { status: "APPROVED" as const } },
      services: { where: { active: true } },
      branches: true,
    },
  },
  services: { where: { active: true }, orderBy: { sortOrder: "asc" as const } },
} satisfies Parameters<typeof prisma.business.findUnique>[0]["include"];

const businessCardSelect = {
  id: true,
  slug: true,
  sourceLocale: true,
  businessName: true,
  shortDescription: true,
  description: true,
  logoUrl: true,
  coverImageUrl: true,
  googlePlaceId: true,
  businessHours: {
    select: { dayOfWeek: true, openTime: true, closeTime: true, isClosed: true },
  },
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
  googleRating: true,
  googleUserRatingCount: true,
  priceRange: true,
  createdAt: true,
  updatedAt: true,
  translations: { select: businessTranslationSelect },
} satisfies BusinessFindManyArgs["select"];

export const businessRepository = {
  findMany: (skip: number, take: number, where: BusinessFilter = {}, sortBy?: BusinessSort) =>
    prisma.business.findMany({
      where: { AND: [where, { removedAt: null, status: "ACTIVE", verified: true }] },
      skip,
      take,
      orderBy: sortBy === "latest"
        ? [{ createdAt: "desc" }]
        : sortBy === "oldest"
          ? [{ createdAt: "asc" }]
          : sortBy === "popular"
            ? [
                { googleUserRatingCount: { sort: "desc", nulls: "last" } },
                { reviewCount: "desc" },
                { averageRating: "desc" },
                { createdAt: "desc" },
              ]
            : [{ featured: "desc" }, { averageRating: "desc" }, { createdAt: "desc" }],
      select: businessCardSelect,
    }),

  count: (where: BusinessFilter = {}) =>
    prisma.business.count({ where: { AND: [where, { removedAt: null, status: "ACTIVE", verified: true }] } }),

  findManyByIds: (ids: string[]) =>
    prisma.business.findMany({
      where: { id: { in: ids }, removedAt: null, status: "ACTIVE", verified: true },
      select: businessCardSelect,
    }),

  findById: (id: string) =>
    prisma.business.findFirst({
      where: { id, removedAt: null, status: "ACTIVE", verified: true },
      include: businessDetailInclude,
    }),

  findBySlug: (slug: string) =>
    prisma.business.findFirst({ where: { slug, removedAt: null } }),

  findDetailBySlug: (slug: string) =>
    prisma.business.findFirst({
      where: { slug, removedAt: null, status: "ACTIVE", verified: true },
      include: businessDetailInclude,
    }),

  create: (data: BusinessCreateData) => prisma.business.create({ data }),

  update: (id: string, data: BusinessUpdateData) =>
    prisma.business.update({ where: { id }, data }),

  delete: (id: string) => prisma.business.delete({ where: { id } }),
};
