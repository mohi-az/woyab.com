import "server-only";

import { cache } from "react";
import type { AppLocale } from "@/i18n/config";
import type { BusinessDetailData, BusinessReviewItem } from "@/lib/api";
import { isStoredGoogleCoverUrl } from "@/lib/business-image-storage";
import { localizeBusinessContent } from "@/lib/business-localization";
import { prisma } from "@/lib/prisma";
import { fetchInternalApiJson } from "@/lib/server-api";

type GooglePhotoList = {
  data?: {
    photos?: Array<{
      photoReference: string;
      htmlAttributions?: string[];
      googleMapsUri?: string | null;
      authorAttributions?: Array<{
        displayName: string;
        uri: string | null;
      }>;
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
        category: { select: { id: true, nameFa: true, nameEn: true, nameDe: true, slug: true, icon: true } },
        subCategory: { select: { id: true, nameFa: true, nameEn: true, nameDe: true } },
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
        tags: { include: { tag: { select: { id: true, slug: true, nameFa: true, nameEn: true, nameDe: true } } } },
        attributes: {
          include: { attribute: true },
          orderBy: { attribute: { sortOrder: "asc" } },
        },
        services: { where: { active: true }, orderBy: { sortOrder: "asc" } },
      },
    });

    if (!business) return null;

    const localized = localizeBusinessContent(business, activeLocale);
    const localizedName = (item?: { nameFa: string; nameEn?: string | null; nameDe?: string | null } | null) => {
      if (!item) return null;
      if (activeLocale === "fa") return item.nameFa;
      if (activeLocale === "de") return item.nameDe || item.nameEn || item.nameFa;
      return item.nameEn || item.nameDe || item.nameFa;
    };
    const localizedTagName = (tag: { nameFa: string; nameEn?: string | null; nameDe?: string | null }) => {
      if (activeLocale === "fa") return tag.nameFa;
      if (activeLocale === "de") return tag.nameDe || tag.nameEn || tag.nameFa;
      return tag.nameEn || tag.nameDe || tag.nameFa;
    };
    const gallery: BusinessDetailData["gallery"] = business.images.map((image) => ({
      id: image.id,
      imageUrl: image.imageUrl,
      caption: image.caption,
    }));

    const storedGoogleCover = Boolean(business.coverImageUrl && isStoredGoogleCoverUrl(business.coverImageUrl));
    if (business.coverImageUrl && !gallery.some((image) => image.imageUrl === business.coverImageUrl)) {
      gallery.unshift({
        id: `${business.id}-cover`,
        imageUrl: business.coverImageUrl,
        caption: localized.businessName,
      });
    }

    // A persisted cover or a manually uploaded image must not suppress the rest
    // of the Google gallery. Merge both sources and keep the stored cover first.
    if (business.googlePlaceId) {
      try {
        const result = await fetchInternalApiJson<GooglePhotoList>(
          `/v1/businesses/${encodeURIComponent(business.id)}/google-photos`,
        );
        const existingUrls = new Set(gallery.map((image) => image.imageUrl));
        for (const [index, photo] of (result.data?.photos ?? []).entries()) {
          // The selected Google cover is already the first gallery item.
          if (business.googleCoverPhotoReference
            ? photo.photoReference === business.googleCoverPhotoReference
            : storedGoogleCover && index === 0) continue;
          const imageUrl = `/api/businesses/${encodeURIComponent(business.id)}/google-photos/${photo.photoReference.split("/").map(encodeURIComponent).join("/")}?maxWidth=1200`;
          if (existingUrls.has(imageUrl)) continue;
          existingUrls.add(imageUrl);
          gallery.push({
            id: `${business.id}-google-${index}`,
            imageUrl,
            caption: photo.htmlAttributions?.[0] ?? localized.businessName,
            sourceUri: photo.googleMapsUri ?? null,
            authorAttributions: photo.authorAttributions?.map((author) => ({
              displayName: author.displayName,
              uri: author.uri,
            })),
          });
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
      subCategoryId: business.subCategory?.id,
      subCategoryName: localizedName(business.subCategory),
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
      tags: business.tags.map(({ tag }) => ({
        id: tag.id,
        slug: tag.slug,
        name: localizedTagName(tag),
      })),
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
  async (businessId: string, locale: string): Promise<BusinessReviewItem[]> => {
    const contentLocale = appLocale(locale).toUpperCase() as "DE" | "EN" | "FA";
    const reviews = await prisma.review.findMany({
      where: { businessId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        translations: { where: { locale: contentLocale } },
        ownerReply: {
          include: {
            owner: { select: { name: true, avatarUrl: true } },
            translations: { where: { locale: contentLocale } },
          },
        },
      },
    });

    return reviews.map((review) => {
      const translation = review.translations[0];
      const replyTranslation = review.ownerReply?.translations[0];
      return {
      id: review.id,
      rating: review.rating,
      title: translation?.title ?? review.title,
      comment: translation?.comment ?? review.comment,
      originalTitle: review.title,
      originalComment: review.comment,
      isTranslated: Boolean(translation),
      sourceLanguageCode: review.sourceLanguageCode,
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
            content: replyTranslation?.content ?? review.ownerReply.content,
            originalContent: review.ownerReply.content,
            isTranslated: Boolean(replyTranslation),
            sourceLanguageCode: review.ownerReply.sourceLanguageCode,
            createdAt: review.ownerReply.createdAt.toISOString(),
            ownerName: review.ownerReply.owner?.name?.trim() || "Business owner",
            ownerAvatarUrl: review.ownerReply.owner?.avatarUrl,
          }
        : null,
      };
    });
  },
);
