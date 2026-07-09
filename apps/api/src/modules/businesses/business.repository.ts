import { prisma } from "../../lib/prisma.js";
import { businessTranslationSelect } from "./business-localization.js";

type BusinessFindManyArgs = NonNullable<Parameters<typeof prisma.business.findMany>[0]>;
type BusinessFilter = BusinessFindManyArgs["where"];
type BusinessCreateData = NonNullable<Parameters<typeof prisma.business.create>[0]>["data"];
type BusinessUpdateData = NonNullable<Parameters<typeof prisma.business.update>[0]>["data"];

type BusinessSort = "latest";

const businessDetailInclude = {
  category: { select: { id: true, nameFa: true, nameEn: true, slug: true, icon: true } },
  subCategory: { select: { id: true, nameFa: true, nameEn: true, slug: true, icon: true } },
  specialty: { select: { id: true, nameFa: true, nameEn: true } },
  owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
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
  _count: { select: { reviews: true, services: true, branches: true } },
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
  translations: { select: businessTranslationSelect },
} satisfies BusinessFindManyArgs["select"];

export const businessRepository = {
  findMany: (skip: number, take: number, where: BusinessFilter = {}, sortBy?: BusinessSort) =>
    prisma.business.findMany({
      where,
      skip,
      take,
      orderBy: sortBy === "latest"
        ? [{ createdAt: "desc" }]
        : [{ featured: "desc" }, { averageRating: "desc" }, { createdAt: "desc" }],
      select: businessCardSelect,
    }),

  count: (where: BusinessFilter = {}) => prisma.business.count({ where }),

  findManyByIds: (ids: string[]) =>
    prisma.business.findMany({
      where: { id: { in: ids } },
      select: businessCardSelect,
    }),

  findById: (id: string) =>
    prisma.business.findUnique({
      where: { id },
      include: businessDetailInclude,
    }),

  findBySlug: (slug: string) => prisma.business.findUnique({ where: { slug } }),

  findDetailBySlug: (slug: string) =>
    prisma.business.findUnique({
      where: { slug },
      include: businessDetailInclude,
    }),

  create: (data: BusinessCreateData) => prisma.business.create({ data }),

  update: (id: string, data: BusinessUpdateData) =>
    prisma.business.update({ where: { id }, data }),

  delete: (id: string) => prisma.business.delete({ where: { id } }),
};
