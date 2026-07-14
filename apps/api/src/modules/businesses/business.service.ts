import type { AppLocale, BusinessSearchBody } from "@fargo/shared";

import { ApiError } from "../../errors/api-error.js";
import type { CreateBusinessBody, ListBusinessesQuery, UpdateBusinessBody } from "./business.schema.js";
import {
  appLocaleToContentLocale,
  contentLocaleToAppLocale,
  inferBusinessLocale,
  localizeBusiness,
} from "./business-localization.js";
import { findBusinessMapPoints } from "./business-map.repository.js";
import { findNearbyBusinesses } from "./business-search.repository.js";
import { businessRepository } from "./business.repository.js";

function businessListWhere(query: ListBusinessesQuery & { favoriteBusinessIds?: string[] }) {
  const { categoryId, subCategoryId, cityId, status, featured, verified, search } = query;

  return {
    ...(categoryId !== undefined && { categoryId }),
    ...(subCategoryId !== undefined && { subCategoryId }),
    ...(cityId !== undefined && { cityId }),
    ...(query.favoriteBusinessIds && { id: { in: query.favoriteBusinessIds } }),
    ...(status && { status }),
    ...(featured !== undefined && { featured: featured === "true" }),
    ...(verified !== undefined && { verified: verified === "true" }),
    ...(search && {
      OR: [
        { businessName: { contains: search, mode: "insensitive" as const } },
        { shortDescription: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
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
    specialtyId: data.specialtyId,
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
    ...(data.specialtyId !== undefined && { specialtyId: data.specialtyId }),
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
      return businessService.list({
        page: input.page,
        limit: input.limit,
        locale: input.locale,
        categoryId: input.categoryId,
        subCategoryId: input.subCategoryId,
        cityId: input.cityId,
        search: input.search,
        sortBy: input.sortBy === "latest" ? "latest" : undefined,
        favoriteBusinessIds: input.favoriteBusinessIds,
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

  list: async (query: ListBusinessesQuery & { favoriteBusinessIds?: string[] }) => {
    const { page, limit, locale, sortBy } = query;
    const skip = (page - 1) * limit;
    const where = businessListWhere(query);

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
    return stripTranslations(localizeBusiness(business, locale));
  },

  getBySlug: async (slug: string, locale: AppLocale) => {
    const business = await businessRepository.findDetailBySlug(slug);
    if (!business) throw ApiError.notFound("Business not found");
    return stripTranslations(localizeBusiness(business, locale));
  },

  create: async (data: CreateBusinessBody) => {
    const existing = await businessRepository.findBySlug(data.slug);
    if (existing) throw ApiError.conflict(`Business with slug "${data.slug}" already exists`);
    return businessRepository.create(buildCreateData(data));
  },

  update: async (id: string, data: UpdateBusinessBody) => {
    const current = await businessRepository.findById(id);
    if (!current) throw ApiError.notFound("Business not found");

    if (data.slug) {
      const existing = await businessRepository.findBySlug(data.slug);
      if (existing && existing.id !== id) throw ApiError.conflict(`Business with slug "${data.slug}" already exists`);
    }

    return businessRepository.update(id, buildUpdateData(current, data));
  },

  delete: async (id: string) => {
    const business = await businessRepository.findById(id);
    if (!business) throw ApiError.notFound("Business not found");
    return businessRepository.delete(id);
  },
};
