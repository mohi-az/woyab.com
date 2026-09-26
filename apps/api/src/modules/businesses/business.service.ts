import type { AppLocale, BusinessSearchBody } from "@woyab/shared";

import { ApiError } from "../../errors/api-error.js";
import type { CreateBusinessBody, ListBusinessesQuery, UpdateBusinessBody } from "./business.schema.js";
import {
  appLocaleToContentLocale,
  contentLocaleToAppLocale,
  inferBusinessLocale,
  localizeBusiness,
} from "./business-localization.js";
import { findBusinessMapPoints } from "./business-map.repository.js";
import { findCurrentlyOpenBusinessIds } from "./business-hours.repository.js";
import { findNearbyBusinesses } from "./business-search.repository.js";
import { businessRepository } from "./business.repository.js";
import { embeddingService } from "../embeddings/embedding.service.js";
import { scheduleEmbeddingUpdate, scheduleEmbeddingDeletion } from "../embeddings/embedding-sync.js";
import { logger } from "../../logger/logger.js";

function businessListWhere(query: ListBusinessesQuery & { favoriteBusinessIds?: string[]; openBusinessIds?: string[] }) {
  const { categoryId, subCategoryId, tagIds, cityId, status, featured, verified, search } = query;

  return {
    AND: [
      ...(query.favoriteBusinessIds ? [{ id: { in: query.favoriteBusinessIds } }] : []),
      ...(query.openBusinessIds ? [{ id: { in: query.openBusinessIds } }] : []),
    ],
    ...(categoryId !== undefined && { categoryId }),
    ...(subCategoryId !== undefined && { subCategoryId }),
    ...(tagIds?.length && { tags: { some: { tagId: { in: tagIds } } } }),
    ...(cityId !== undefined && { cityId }),
    ...(status && { status }),
    ...(featured !== undefined && { featured: featured === "true" }),
    ...(verified !== undefined && { verified: verified === "true" }),
    ...(search && {
      OR: [
        { businessName: { contains: search, mode: "insensitive" as const } },
        { shortDescription: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
        { category: { OR: [
          { nameFa: { contains: search, mode: "insensitive" as const } },
          { nameEn: { contains: search, mode: "insensitive" as const } },
          { nameDe: { contains: search, mode: "insensitive" as const } },
        ] } },
        { subCategory: { OR: [
          { nameFa: { contains: search, mode: "insensitive" as const } },
          { nameEn: { contains: search, mode: "insensitive" as const } },
          { nameDe: { contains: search, mode: "insensitive" as const } },
        ] } },
        { tags: { some: { tag: { OR: [
          { nameFa: { contains: search, mode: "insensitive" as const } },
          { nameEn: { contains: search, mode: "insensitive" as const } },
          { nameDe: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ] } } } },
        {
          translations: {
            some: {
              OR: [
                { businessName: { contains: search, mode: "insensitive" as const } },
                { shortDescription: { contains: search, mode: "insensitive" as const } },
                { description: { contains: search, mode: "insensitive" as const } },
              ],
            },
          },
        },
      ],
    }),
  };
}

function stripTranslations<T extends { translations?: unknown }>(item: T) {
  const { translations: _translations, ...rest } = item;
  return rest;
}

function publicBusinessDetail<T extends {
  translations?: unknown;
  ownerId?: string | null;
  removedById?: string | null;
  removedAt?: Date | null;
  restoredAt?: Date | null;
}>(item: T) {
  const {
    translations: _translations,
    ownerId,
    removedById: _removedById,
    removedAt: _removedAt,
    restoredAt: _restoredAt,
    ...rest
  } = item;
  return { ...rest, hasOwner: Boolean(ownerId) };
}

function localizeItems<T extends {
  id: string;
  sourceLocale: "DE" | "EN" | "FA";
  businessName: string;
  shortDescription: string | null;
  description: string | null;
  translations?: Array<{
    locale: "DE" | "EN" | "FA";
    businessName: string;
    shortDescription: string | null;
    description: string | null;
  }>;
}>(items: T[], locale: AppLocale): Array<Omit<T, "translations"> & { contentLocale: AppLocale; isFallback: boolean }> {
  return items.map((item) => stripTranslations(localizeBusiness(item, locale)) as Omit<T, "translations"> & {
    contentLocale: AppLocale;
    isFallback: boolean;
  });
}

function buildCreateData(data: CreateBusinessBody) {
  const sourceLocale = data.sourceLocale ?? inferBusinessLocale(data);
  const translations = new Map(
    (data.translations ?? []).map((translation) => [translation.locale, translation]),
  );

  translations.set(sourceLocale, {
    locale: sourceLocale,
    businessName: data.businessName,
    shortDescription: data.shortDescription,
    description: data.description,
  });

  return {
    slug: data.slug,
    sourceLocale: appLocaleToContentLocale(sourceLocale),
    businessName: data.businessName,
    legalName: data.legalName,
    shortDescription: data.shortDescription,
    description: data.description,
    logoUrl: data.logoUrl,
    coverImageUrl: data.coverImageUrl,
    googlePlaceId: data.googlePlaceId,
    categoryId: data.categoryId,
    subCategoryId: data.subCategoryId,
    ownerId: data.ownerId,
    establishedYear: data.establishedYear,
    priceRange: data.priceRange,
    phone: data.phone,
    mobile: data.mobile,
    whatsapp: data.whatsapp,
    email: data.email,
    website: data.website,
    instagram: data.instagram,
    telegram: data.telegram,
    facebook: data.facebook,
    youtube: data.youtube,
    linkedin: data.linkedin,
    latitude: data.latitude,
    longitude: data.longitude,
    cityId: data.cityId,
    districtId: data.districtId,
    address: data.address,
    postalCode: data.postalCode,
    status: data.status,
    verified: data.verified,
    featured: data.featured,
    ...(data.attributes !== undefined && {
      attributes: {
        create: data.attributes.map((attribute) => ({
          attributeId: attribute.attributeId,
          value: attribute.value,
        })),
      },
    }),
    ...(data.tagIds !== undefined && {
      tags: {
        create: [...new Set(data.tagIds)].map((tagId) => ({ tagId })),
      },
    }),
    translations: {
      create: [...translations.values()].map((translation) => ({
        locale: appLocaleToContentLocale(translation.locale),
        businessName: translation.businessName,
        shortDescription: translation.shortDescription ?? null,
        description: translation.description ?? null,
      })),
    },
  };
}

function buildUpdateData(
  existing: NonNullable<Awaited<ReturnType<typeof businessRepository.findById>>>,
  data: UpdateBusinessBody,
) {
  const localizationChanged =
    data.sourceLocale !== undefined
    || data.businessName !== undefined
    || data.shortDescription !== undefined
    || data.description !== undefined
    || data.translations !== undefined;

  const sourceLocale = data.sourceLocale ?? contentLocaleToAppLocale(existing.sourceLocale);
  const translationMap = new Map(
    (existing.translations ?? []).map((translation) => [
      contentLocaleToAppLocale(translation.locale),
      {
        locale: contentLocaleToAppLocale(translation.locale),
        businessName: translation.businessName,
        shortDescription: translation.shortDescription,
        description: translation.description,
      },
    ]),
  );

  translationMap.set(contentLocaleToAppLocale(existing.sourceLocale), {
    locale: contentLocaleToAppLocale(existing.sourceLocale),
    businessName: existing.businessName,
    shortDescription: existing.shortDescription,
    description: existing.description,
  });

  for (const translation of data.translations ?? []) {
    translationMap.set(translation.locale, {
      locale: translation.locale,
      businessName: translation.businessName,
      shortDescription: translation.shortDescription ?? null,
      description: translation.description ?? null,
    });
  }

  if (localizationChanged) {
    translationMap.set(sourceLocale, {
      locale: sourceLocale,
      businessName: data.businessName ?? translationMap.get(sourceLocale)?.businessName ?? existing.businessName,
      shortDescription: data.shortDescription ?? translationMap.get(sourceLocale)?.shortDescription ?? existing.shortDescription,
      description: data.description ?? translationMap.get(sourceLocale)?.description ?? existing.description,
    });
  }

  const sourceTranslation = translationMap.get(sourceLocale) ?? {
    locale: sourceLocale,
    businessName: data.businessName ?? existing.businessName,
    shortDescription: data.shortDescription ?? existing.shortDescription,
    description: data.description ?? existing.description,
  };

  return {
    ...(data.slug !== undefined && { slug: data.slug }),
    ...(localizationChanged && {
      sourceLocale: appLocaleToContentLocale(sourceLocale),
      businessName: sourceTranslation.businessName,
      shortDescription: sourceTranslation.shortDescription ?? null,
      description: sourceTranslation.description ?? null,
      translations: {
        upsert: [...translationMap.values()].map((translation) => ({
          where: {
            businessId_locale: {
              businessId: existing.id,
              locale: appLocaleToContentLocale(translation.locale),
            },
          },
          update: {
            businessName: translation.businessName,
            shortDescription: translation.shortDescription ?? null,
            description: translation.description ?? null,
          },
          create: {
            locale: appLocaleToContentLocale(translation.locale),
            businessName: translation.businessName,
            shortDescription: translation.shortDescription ?? null,
            description: translation.description ?? null,
          },
        })),
      },
    }),
    ...(data.legalName !== undefined && { legalName: data.legalName }),
    ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
    ...(data.coverImageUrl !== undefined && { coverImageUrl: data.coverImageUrl }),
    ...(data.googlePlaceId !== undefined && { googlePlaceId: data.googlePlaceId }),
    ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
    ...(data.subCategoryId !== undefined && { subCategoryId: data.subCategoryId }),
    ...(data.ownerId !== undefined && { ownerId: data.ownerId }),
    ...(data.establishedYear !== undefined && { establishedYear: data.establishedYear }),
    ...(data.priceRange !== undefined && { priceRange: data.priceRange }),
    ...(data.phone !== undefined && { phone: data.phone }),
    ...(data.mobile !== undefined && { mobile: data.mobile }),
    ...(data.whatsapp !== undefined && { whatsapp: data.whatsapp }),
    ...(data.email !== undefined && { email: data.email }),
    ...(data.website !== undefined && { website: data.website }),
    ...(data.instagram !== undefined && { instagram: data.instagram }),
    ...(data.telegram !== undefined && { telegram: data.telegram }),
    ...(data.facebook !== undefined && { facebook: data.facebook }),
    ...(data.youtube !== undefined && { youtube: data.youtube }),
    ...(data.linkedin !== undefined && { linkedin: data.linkedin }),
    ...(data.latitude !== undefined && { latitude: data.latitude }),
    ...(data.longitude !== undefined && { longitude: data.longitude }),
    ...(data.cityId !== undefined && { cityId: data.cityId }),
    ...(data.districtId !== undefined && { districtId: data.districtId }),
    ...(data.address !== undefined && { address: data.address }),
    ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
    ...(data.status !== undefined && { status: data.status }),
    ...(data.verified !== undefined && { verified: data.verified }),
    ...(data.featured !== undefined && { featured: data.featured }),
    ...(data.attributes !== undefined && {
      attributes: {
        deleteMany: {},
        create: data.attributes.map((attribute) => ({
          attributeId: attribute.attributeId,
          value: attribute.value,
        })),
      },
    }),
    ...(data.tagIds !== undefined && {
      tags: {
        deleteMany: {},
        create: [...new Set(data.tagIds)].map((tagId) => ({ tagId })),
      },
    }),
  };
}

export const businessService = {
  map: findBusinessMapPoints,

  search: async (input: BusinessSearchBody) => {
    if (!input.origin) {
      const openBusinessIds = input.openNow ? await findCurrentlyOpenBusinessIds() : undefined;

      const trimmedSearch = input.search?.trim();
      if (trimmedSearch && embeddingService.isAvailable()) {
        try {
          const semanticResult = await embeddingService.search({
            query: trimmedSearch,
            locale: input.locale,
            categoryId: input.categoryId,
            subCategoryId: input.subCategoryId,
            cityId: input.cityId,
            tagIds: input.tagIds,
            limit: input.limit * input.page,
            minSimilarity: 0.6,
          });

          if (semanticResult.items.length > 0) {
            let filteredItems = semanticResult.items;

            if (openBusinessIds) {
              const openSet = new Set(openBusinessIds);
              filteredItems = filteredItems.filter((item) => openSet.has(item.id));
            }
            if (input.favoriteBusinessIds && input.favoriteBusinessIds.length > 0) {
              const favSet = new Set(input.favoriteBusinessIds);
              filteredItems = filteredItems.filter((item) => favSet.has(item.id));
            }

            const total = filteredItems.length;
            const startIdx = (input.page - 1) * input.limit;
            const pagedItems = filteredItems.slice(startIdx, startIdx + input.limit);

            if (pagedItems.length > 0 || input.page === 1) {
              return {
                items: pagedItems,
                total,
                page: input.page,
                limit: input.limit,
                totalPages: Math.ceil(total / input.limit) || 1,
              };
            }
          }
        } catch (error) {
          logger.warn(
            { error: (error as Error).message, query: trimmedSearch },
            "Semantic search attempt failed, falling back to keyword search",
          );
        }
      }

      return businessService.list({
        page: input.page,
        limit: input.limit,
        locale: input.locale,
        categoryId: input.categoryId,
        subCategoryId: input.subCategoryId,
        tagIds: input.tagIds,
        cityId: input.cityId,
        search: input.search,
        sortBy: input.sortBy === "latest" || input.sortBy === "oldest" || input.sortBy === "popular"
          ? input.sortBy
          : undefined,
        favoriteBusinessIds: input.favoriteBusinessIds,
        openBusinessIds,
      });
    }

    const { matches, total } = await findNearbyBusinesses(input);
    const businesses = await businessRepository.findManyByIds(matches.map((match) => match.businessId));
    const localizedBusinesses = localizeItems(businesses, input.locale);
    const byId = new Map(localizedBusinesses.map((business) => [business.id, business]));
    const items = matches.flatMap((match) => {
      const business = byId.get(match.businessId);
      if (!business) return [];

      return [{
        ...business,
        distanceMeters: match.distanceMeters,
        matchedLocation: {
          id: match.locationId,
          type: match.locationType,
          name: match.locationName,
          city: {
            nameEn: match.cityNameEn,
            nameFa: match.cityNameFa,
          },
        },
      }];
    });

    return {
      items,
      total,
      page: input.page,
      limit: input.limit,
      totalPages: Math.ceil(total / input.limit),
    };
  },

  list: async (query: ListBusinessesQuery & { favoriteBusinessIds?: string[]; openBusinessIds?: string[] }) => {
    const { page, limit, locale, sortBy } = query;
    const skip = (page - 1) * limit;
    const openBusinessIds = query.openBusinessIds
      ?? (query.openNow === "true" ? await findCurrentlyOpenBusinessIds() : undefined);
    const where = businessListWhere({ ...query, openBusinessIds });

    const [items, total] = await Promise.all([
      businessRepository.findMany(skip, limit, where, sortBy),
      businessRepository.count(where),
    ]);

    return {
      items: localizeItems(items, locale),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  getById: async (id: string, locale: AppLocale) => {
    const business = await businessRepository.findById(id);
    if (!business) throw ApiError.notFound("Business not found");
    return publicBusinessDetail(localizeBusiness(business, locale));
  },

  getBySlug: async (slug: string, locale: AppLocale) => {
    const business = await businessRepository.findDetailBySlug(slug);
    if (!business) throw ApiError.notFound("Business not found");
    return publicBusinessDetail(localizeBusiness(business, locale));
  },

  create: async (data: CreateBusinessBody) => {
    const existing = await businessRepository.findBySlug(data.slug);
    if (existing) throw ApiError.conflict(`Business with slug "${data.slug}" already exists`);
    const created = await businessRepository.create(buildCreateData(data));
    scheduleEmbeddingUpdate(created.id);
    return created;
  },

  update: async (id: string, data: UpdateBusinessBody) => {
    const current = await businessRepository.findById(id);
    if (!current) throw ApiError.notFound("Business not found");

    if (data.slug) {
      const existing = await businessRepository.findBySlug(data.slug);
      if (existing && existing.id !== id) throw ApiError.conflict(`Business with slug "${data.slug}" already exists`);
    }

    const updated = await businessRepository.update(id, buildUpdateData(current, data));
    scheduleEmbeddingUpdate(id);
    return updated;
  },

  delete: async (id: string) => {
    const business = await businessRepository.findById(id);
    if (!business) throw ApiError.notFound("Business not found");
    const deleted = await businessRepository.delete(id);
    scheduleEmbeddingDeletion(id);
    return deleted;
  },
};
