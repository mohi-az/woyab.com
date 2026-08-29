import "server-only";

import type { AppLocale } from "@/i18n/config";
import { localizeBusinessContent } from "@/lib/business-localization";
import { prisma } from "@/lib/prisma";
import type { DirectoryFilterOption, LatestBusinessCardItem } from "@/lib/api";

const visibleBusinessWhere = {
  status: "ACTIVE" as const,
  verified: true,
  removedAt: null,
};

export type HomeData = {
  categories: DirectoryFilterOption[];
  cities: DirectoryFilterOption[];
  latestBusinesses: LatestBusinessCardItem[];
};

export async function fetchHomeData(locale: AppLocale): Promise<HomeData> {
  const [categoryRows, cityRows, businessRows] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      select: {
        id: true,
        nameFa: true,
        nameEn: true,
        nameDe: true,
        slug: true,
        icon: true,
        _count: { select: { businesses: { where: visibleBusinessWhere } } },
      },
    }),
    prisma.city.findMany({
      orderBy: { nameEn: "asc" },
      select: {
        id: true,
        nameFa: true,
        nameEn: true,
        slug: true,
        latitude: true,
        longitude: true,
        _count: { select: { businesses: { where: visibleBusinessWhere } } },
      },
    }),
    prisma.business.findMany({
      where: visibleBusinessWhere,
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        sourceLocale: true,
        businessName: true,
        shortDescription: true,
        coverImageUrl: true,
        googlePlaceId: true,
        averageRating: true,
        reviewCount: true,
        googleRating: true,
        googleUserRatingCount: true,
        featured: true,
        category: { select: { nameFa: true, nameEn: true, nameDe: true, slug: true, icon: true } },
        city: { select: { nameFa: true, nameEn: true } },
        businessHours: {
          orderBy: { dayOfWeek: "asc" },
          select: { dayOfWeek: true, openTime: true, closeTime: true, isClosed: true },
        },
        translations: {
          select: {
            locale: true,
            businessName: true,
            shortDescription: true,
            description: true,
          },
        },
      },
    }),
  ]);

  const localizedName = (item: { nameFa: string; nameEn: string; nameDe?: string | null }) =>
    locale === "fa" ? item.nameFa : locale === "de" ? item.nameDe || item.nameEn : item.nameEn;

  return {
    categories: categoryRows.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: localizedName(category),
      count: category._count.businesses,
      iconKey: category.icon,
    })),
    cities: cityRows.map((city) => ({
      id: city.id,
      slug: city.slug,
      name: localizedName(city),
      count: city._count.businesses,
      latitude: city.latitude,
      longitude: city.longitude,
    })),
    latestBusinesses: businessRows.map((business) => {
      const localized = localizeBusinessContent(business, locale);
      return {
        id: business.id,
        businessId: business.id,
        slug: business.slug,
        href: `/businesses/${business.slug}`,
        title: localized.businessName,
        imageUrl: business.coverImageUrl || !business.googlePlaceId
          ? business.coverImageUrl
          : `/api/businesses/${encodeURIComponent(business.id)}/google-photo-thumbnail?maxWidth=640`,
        fallbackImageUrl: null,
        shortDescription: localized.shortDescription,
        categoryName: localizedName(business.category),
        categorySlug: business.category.slug,
        categoryIconKey: business.category.icon,
        rating: business.googleRating ?? business.averageRating,
        reviewCount: business.googleUserRatingCount ?? business.reviewCount,
        location: localizedName(business.city),
        featured: business.featured,
        googlePlaceId: business.googlePlaceId,
        hours: business.businessHours,
      };
    }),
  };
}
