import "server-only";

import { cache } from "react";
import type { AppLocale } from "@/i18n/config";
import type { BusinessDetailData, BusinessReviewItem } from "@/lib/api";
import { isStoredGoogleCoverUrl } from "@/lib/business-image-storage";
import { localizeBusinessContent } from "@/lib/business-localization";
import { prisma } from "@/lib/prisma";

const API_BASE = process.env.API_URL ?? "http://localhost:4000";

type GooglePhotoList = {
  data?: {
    photos?: Array<{
      photoReference: string;
      htmlAttributions?: string[];
    }>;
  };
};

function appLocale(locale: string): AppLocale {
  return locale === "fa" || locale === "en" ? locale : "de";
}

function attributeValueIsSupported(dataType: string, value: string) {
  if (!value) return false;
  if (dataType === "BOOLEAN") return value === "true";
  if (value === "true" || value === "false") return false;
  if (dataType === "NUMBER") return Number.isFinite(Number(value));
  return dataType === "TEXT";
}

export const fetchBusinessDetailFromDatabase = cache(
  async (locale: string, slug: string): Promise<BusinessDetailData | null> => {
    const activeLocale = appLocale(locale);
    const business = await prisma.business.findFirst({
      where: {
        slug,
        status: "ACTIVE",
        verified: true,
        removedAt: null,
      },
      include: {
        category: { select: { id: true, nameFa: true, nameEn: true, slug: true, icon: true } },
        subCategory: { select: { nameFa: true, nameEn: true } },
        specialty: { select: { nameFa: true, nameEn: true } },
        city: { select: { id: true, nameFa: true, nameEn: true } },
        businessHours: { orderBy: { dayOfWeek: "asc" } },
        images: { orderBy: { sortOrder: "asc" } },
        translations: {
          select: {
            locale: true,
            businessName: true,
            shortDescription: true,
            description: true,
          },
        },
        tags: { include: { tag: { select: { nameFa: true, nameEn: true } } } },
        attributes: {
          include: { attribute: true },
          orderBy: { attribute: { sortOrder: "asc" } },
        },
        services: { where: { active: true }, orderBy: { sortOrder: "asc" } },
      },
    });

    if (!business) return null;

    const localized = localizeBusinessContent(business, activeLocale);
    const localizedName = (item?: { nameFa: string; nameEn?: string | null } | null) => {
      if (!item) return null;
      return activeLocale === "fa" ? item.nameFa : item.nameEn || item.nameFa;
    };
    const gallery = business.images.map((image) => ({
      id: image.id,
      imageUrl: image.imageUrl,
      caption: image.caption,
    }));
    if (gallery.length === 0 && business.googlePlaceId && (!business.coverImageUrl || isStoredGoogleCoverUrl(business.coverImageUrl))) {
      try {
        const response = await fetch(
          `${API_BASE}/v1/businesses/${encodeURIComponent(business.id)}/google-photos`,
          { cache: "no-store" },
        );
        if (response.ok) {
          const result = (await response.json()) as GooglePhotoList;
          gallery.push(...(result.data?.photos ?? []).map((photo, index) => ({
            id: `${business.id}-google-${index}`,
            imageUrl: `/api/businesses/${encodeURIComponent(business.id)}/google-photos/${photo.photoReference.split("/").map(encodeURIComponent).join("/")}?maxWidth=1200`,
            caption: photo.htmlAttributions?.[0] ?? localized.businessName,
          })));
        }
      } catch {
        // The image list is optional; the first-photo proxy below remains available.
      }
      if (gallery.length === 0) {
        gallery.push({
          id: `${business.id}-google-cover`,
          imageUrl: `/api/businesses/${encodeURIComponent(business.id)}/google-photo-thumbnail?maxWidth=1600`,
          caption: localized.businessName,
        });
      }
    } else if (gallery.length === 0 && business.coverImageUrl) {
      gallery.push({
        id: `${business.id}-cover`,
        imageUrl: business.coverImageUrl,
        caption: localized.businessName,
      });
    }

    return {
      id: business.id,
      slug: business.slug,
      title: localized.businessName,
      legalName: business.legalName,
      shortDescription: localized.shortDescription,
      description: localized.description,
      logoUrl: business.logoUrl,
      coverImageUrl: business.coverImageUrl,
      gallery,
      googlePlaceId: business.googlePlaceId,
      googleRating: business.googleRating,
      googleUserRatingCount: business.googleUserRatingCount,
      categoryName: localizedName(business.category),
      categoryId: business.category.id,
      categorySlug: business.category.slug,
      categoryIconKey: business.category.icon,
      subCategoryName: localizedName(business.subCategory),
      specialtyName: localizedName(business.specialty),
      cityId: business.city.id,
      location: localizedName(business.city),
      address: business.address,
      latitude: business.latitude,
      longitude: business.longitude,
      postalCode: business.postalCode,
      phone: business.phone,
      mobile: business.mobile,
      whatsapp: business.whatsapp,
      email: business.email,
      website: business.website,
      socialLinks: ([
        ["instagram", business.instagram],
        ["telegram", business.telegram],
        ["facebook", business.facebook],
        ["youtube", business.youtube],
        ["linkedin", business.linkedin],
      ] as const).flatMap(([key, url]) => (url ? [{ key, url }] : [])),
      establishedYear: business.establishedYear,
      priceRange: business.priceRange,
      rating: business.averageRating,
      reviewCount: business.reviewCount,
      verified: business.verified,
      featured: business.featured,
      hasOwner: Boolean(business.ownerId),
      hours: business.businessHours.map((hour) => ({
        dayOfWeek: hour.dayOfWeek,
        openTime: hour.openTime,
        closeTime: hour.closeTime,
        isClosed: hour.isClosed,
        note: hour.note,
      })),
      tags: business.tags.map(({ tag }) => localizedName(tag) ?? tag.nameFa),
      attributes: business.attributes.flatMap(({ attribute, value }) => {
        if (!attributeValueIsSupported(attribute.dataType, value)) return [];
        return [{
          id: attribute.id,
          key: attribute.key,
          label: activeLocale === "fa"
            ? attribute.labelFa
            : activeLocale === "de"
              ? attribute.labelDe || attribute.labelEn || attribute.labelFa
              : attribute.labelEn || attribute.labelDe || attribute.labelFa,
          value,
          dataType: attribute.dataType as "TEXT" | "NUMBER" | "BOOLEAN",
          unit: attribute.unit,
        }];
      }),
      services: business.services.map((service) => ({
        id: service.id,
        title: service.title,
        description: service.description,
        price: service.price?.toString() ?? null,
        currency: service.currency,
        duration: service.duration,
        unit: service.unit,
      })),
    };
  },
);

export const fetchBusinessReviewsFromDatabase = cache(
  async (businessId: string): Promise<BusinessReviewItem[]> => {
    const reviews = await prisma.review.findMany({
      where: { businessId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        ownerReply: {
          include: { owner: { select: { name: true, avatarUrl: true } } },
        },
      },
    });

    return reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      visitDate: review.visitDate?.toISOString() ?? null,
      helpfulCount: review.helpfulCount,
      status: review.status,
      user: {
        id: review.user?.id ?? "anonymous",
        name: review.user?.name?.trim() || "Anonymous",
        avatarUrl: review.user?.avatarUrl,
      },
      ownerReply: review.ownerReply
        ? {
            id: review.ownerReply.id,
            content: review.ownerReply.content,
            createdAt: review.ownerReply.createdAt.toISOString(),
            ownerName: review.ownerReply.owner?.name?.trim() || "Business owner",
            ownerAvatarUrl: review.ownerReply.owner?.avatarUrl,
          }
        : null,
    }));
  },
);
