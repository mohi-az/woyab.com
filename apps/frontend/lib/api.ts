import type { AppLocale, BusinessSearchBody, LocationOrigin } from "@fargo/shared";

type CategoryApiItem = {
  id: number;
  nameFa: string;
  nameEn: string;
  slug: string;
  icon?: string | null;
  _count: { businesses: number; subCategories: number };
};

type DirectoryOptionApiItem = {
  id: number;
  nameFa: string;
  nameEn: string;
  slug: string;
  icon?: string | null;
  _count?: { businesses?: number };
  category?: { id: number };
  latitude?: number | null;
  longitude?: number | null;
};

type BusinessApiItem = {
  id: string;
  slug: string;
  businessName: string;
  coverImageUrl?: string | null;
  googlePlaceId?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  contentLocale?: "de" | "en" | "fa";
  isFallback?: boolean;
  averageRating?: number | null;
  reviewCount?: number | null;
  featured?: boolean;
  category?: {
    nameFa: string;
    nameEn: string;
    slug: string;
    icon?: string | null;
  } | null;
  city?: {
    nameFa: string;
    nameEn: string;
    slug: string;
  } | null;
  distanceMeters?: number;
  matchedLocation?: {
    id: string;
    type: "PRIMARY" | "BRANCH";
    name?: string | null;
    city?: { nameFa?: string | null; nameEn?: string | null } | null;
  } | null;
};

type BusinessDetailApiResponse = {
  success: boolean;
  data: {
    id: string;
    slug: string;
    businessName: string;
    legalName?: string | null;
    shortDescription?: string | null;
    description?: string | null;
    contentLocale?: "de" | "en" | "fa";
    isFallback?: boolean;
    logoUrl?: string | null;
    coverImageUrl?: string | null;
    googlePlaceId?: string | null;
    phone?: string | null;
    mobile?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    website?: string | null;
    instagram?: string | null;
    telegram?: string | null;
    facebook?: string | null;
    youtube?: string | null;
    linkedin?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    postalCode?: string | null;
    establishedYear?: number | null;
    priceRange?: "BUDGET" | "MODERATE" | "EXPENSIVE" | "LUXURY" | null;
    averageRating?: number | null;
    reviewCount?: number | null;
    verified?: boolean;
    featured?: boolean;
    owner?: { id: string } | null;
    category?: {
      id: number;
      nameFa: string;
      nameEn: string;
      slug: string;
      icon?: string | null;
    } | null;
    subCategory?: {
      id: number;
      nameFa: string;
      nameEn: string;
      slug: string;
      icon?: string | null;
    } | null;
    specialty?: {
      id: number;
      nameFa: string;
      nameEn: string;
    } | null;
    city?: {
      id: number;
      nameFa: string;
      nameEn: string;
      slug: string;
    } | null;
    district?: {
      id: number;
      nameFa: string;
      nameEn: string;
    } | null;
    businessHours?: Array<{
      id: number;
      dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
      openTime?: string | null;
      closeTime?: string | null;
      isClosed: boolean;
      note?: string | null;
    }>;
    attributes?: Array<{
      attributeId: number;
      value: string;
      attribute: {
        id: number;
        key: string;
        labelFa: string;
        labelEn?: string | null;
        labelDe?: string | null;
        dataType: "TEXT" | "NUMBER" | "BOOLEAN";
        unit?: string | null;
      };
    }>;
    tags?: Array<{
      tag: {
        id: number;
        nameFa: string;
        nameEn: string;
        slug: string;
      };
    }>;
    images?: Array<{
      id: string;
      imageUrl: string;
      caption?: string | null;
      sortOrder: number;
    }>;
    services?: Array<{
      id: string;
      title: string;
      description?: string | null;
      price?: string | number | null;
      currency: string;
      duration?: number | null;
      unit?: string | null;
    }>;
    _count?: {
      reviews: number;
      services: number;
      branches: number;
    };
  };
};

type ReviewApiItem = {
  id: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  visitDate?: string | null;
  helpfulCount?: number;
  verified?: boolean;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  user?: {
    id: string;
    name?: string | null;
    avatarUrl?: string | null;
  } | null;
  ownerReply?: {
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    owner?: {
      id: string;
      name?: string | null;
      avatarUrl?: string | null;
    } | null;
  } | null;
};

type PaginatedResponse<T> = {
  success: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type CategoryListResponse = {
  success: boolean;
  data: {
    items: CategoryApiItem[];
    total: number;
    page: number;
    limit: number;
  };
};

type BusinessListResponse = {
  success: boolean;
  data: {
    items: BusinessApiItem[];
    total: number;
    page: number;
    limit: number;
  };
};

export type BusinessDirectoryFilters = {
  page: number;
  limit: number;
  search?: string;
  categoryId?: number;
  subCategoryId?: number;
  cityId?: number;
  sortBy?: "latest" | "distance";
  favoritesOnly?: boolean;
};

export type DirectoryFilterOption = {
  id: number;
  slug: string;
  name: string;
  count?: number;
  iconKey?: string | null;
  parentId?: number;
  latitude?: number | null;
  longitude?: number | null;
};

export type BusinessDirectoryData = {
  items: LatestBusinessCardItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type LatestBusinessCardItem = {
  id: string;
  businessId: string;
  slug: string;
  href: string;
  title: string;
  imageUrl?: string | null;
  fallbackImageUrl?: string | null;
  shortDescription?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  categoryIconKey?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  location?: string | null;
  distanceMeters?: number | null;
  matchedLocationName?: string | null;
  featured?: boolean;
  googlePlaceId?: string | null;
};

export type BusinessDetailData = {
  id: string;
  slug: string;
  title: string;
  legalName?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  gallery: Array<{
    id: string;
    imageUrl: string;
    caption?: string | null;
  }>;
  googlePlaceId?: string | null;
  categoryName?: string | null;
  categoryId?: number | null;
  categorySlug?: string | null;
  categoryIconKey?: string | null;
  subCategoryName?: string | null;
  specialtyName?: string | null;
  cityId?: number | null;
  location?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  postalCode?: string | null;
  phone?: string | null;
  mobile?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  socialLinks: Array<{
    key: "instagram" | "telegram" | "facebook" | "youtube" | "linkedin";
    url: string;
  }>;
  establishedYear?: number | null;
  priceRange?: "BUDGET" | "MODERATE" | "EXPENSIVE" | "LUXURY" | null;
  rating: number;
  reviewCount: number;
  verified: boolean;
  featured: boolean;
  hasOwner: boolean;
  hours: Array<{
    dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
    openTime?: string | null;
    closeTime?: string | null;
    isClosed: boolean;
    note?: string | null;
  }>;
  tags: string[];
  attributes: Array<{
    id: number;
    key: string;
    label: string;
    value: string;
    dataType: "TEXT" | "NUMBER" | "BOOLEAN";
    unit?: string | null;
  }>;
  services: Array<{
    id: string;
    title: string;
    description?: string | null;
    price?: string | number | null;
    currency: string;
    duration?: number | null;
    unit?: string | null;
  }>;
};

export type BusinessReviewItem = {
  id: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  createdAt: string;
  visitDate?: string | null;
  verified: boolean;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
  ownerReply?: {
    id: string;
    content: string;
    createdAt: string;
    ownerName: string;
    ownerAvatarUrl?: string | null;
  } | null;
};

export type CurrentUser = {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
};

const API_BASE = process.env.API_URL ?? "http://localhost:4000";

function businessCardImageProps(business: Pick<BusinessApiItem, "id" | "coverImageUrl" | "googlePlaceId">) {
  if (business.coverImageUrl || !business.googlePlaceId) {
    return { imageUrl: business.coverImageUrl, fallbackImageUrl: null };
  }

  return {
    imageUrl: `/api/businesses/${encodeURIComponent(business.id)}/google-photo-thumbnail?maxWidth=640`,
    fallbackImageUrl: business.coverImageUrl,
  };
}

function booleanFlag(value: unknown) {
  return value === true || value === "true";
}

function compatibleAttributeValue(dataType: string, value: string) {
  if (!value) return false;
  if (dataType === "BOOLEAN") return value === "true";
  if (value === "true" || value === "false") return false;
  if (dataType === "NUMBER") return Number.isFinite(Number(value));
  return dataType === "TEXT";
}

function getLocalizedName(
  locale: string,
  item?: { nameFa: string; nameEn: string } | null,
) {
  if (!item) return null;
  return locale === "fa" ? item.nameFa : item.nameEn;
}

export async function fetchCategoryCounts(): Promise<Record<number, number>> {
  try {
    const res = await fetch(`${API_BASE}/v1/categories?limit=20&active=true`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return {};
    const json = (await res.json()) as CategoryListResponse;
    const items = json.data?.items ?? [];
    return Object.fromEntries(
      items.map((cat) => [cat.id, cat._count?.businesses ?? 0]),
    );
  } catch {
    return {};
  }
}

export async function fetchLatestBusinesses(locale: string): Promise<LatestBusinessCardItem[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/businesses?limit=8&status=ACTIVE&sortBy=latest&locale=${encodeURIComponent(locale)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];

    const json = (await res.json()) as BusinessListResponse;
    const items = json.data?.items ?? [];

    return items.map((business) => ({
      id: business.id,
      businessId: business.id,
      slug: business.slug,
      href: `/businesses/${business.slug}`,
      title: business.businessName,
      ...businessCardImageProps(business),
      shortDescription: business.shortDescription,
      categoryName: getLocalizedName(locale, business.category),
      categorySlug: business.category?.slug,
      categoryIconKey: business.category?.icon,
      rating: business.averageRating ?? 0,
      reviewCount: business.reviewCount ?? 0,
      location: getLocalizedName(locale, business.city),
      featured: booleanFlag(business.featured),
      googlePlaceId: business.googlePlaceId,
    }));
  } catch {
    return [];
  }
}

function directoryParams(filters: BusinessDirectoryFilters) {
  const params = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
    status: "ACTIVE",
  });

  if (filters.search) params.set("search", filters.search);
  if (filters.categoryId) params.set("categoryId", String(filters.categoryId));
  if (filters.subCategoryId) params.set("subCategoryId", String(filters.subCategoryId));
  if (filters.cityId) params.set("cityId", String(filters.cityId));
  if (filters.sortBy) params.set("sortBy", filters.sortBy);

  return params;
}

export async function fetchBusinessDirectory(
  locale: string,
  filters: BusinessDirectoryFilters,
): Promise<BusinessDirectoryData> {
  const fallback = {
    items: [],
    total: 0,
    page: filters.page,
    limit: filters.limit,
    totalPages: 0,
  };

  try {
    const params = directoryParams(filters);
    params.set("locale", locale);
    const res = await fetch(`${API_BASE}/v1/businesses?${params}`, {
      cache: "no-store",
    });
    if (!res.ok) return fallback;

    const json = (await res.json()) as PaginatedResponse<BusinessApiItem>;
    return {
      ...json.data,
      items: (json.data?.items ?? []).map((business) => ({
        id: business.id,
        businessId: business.id,
        slug: business.slug,
        href: `/businesses/${business.slug}`,
        title: business.businessName,
        ...businessCardImageProps(business),
        shortDescription: business.shortDescription,
        categoryName: getLocalizedName(locale, business.category),
        categorySlug: business.category?.slug,
        categoryIconKey: business.category?.icon,
        rating: business.averageRating ?? 0,
        reviewCount: business.reviewCount ?? 0,
        location: localizedBusinessLocation(locale, business),
        distanceMeters: business.distanceMeters,
        matchedLocationName: business.matchedLocation?.type === "BRANCH" ? business.matchedLocation.name : null,
        featured: booleanFlag(business.featured),
        googlePlaceId: business.googlePlaceId,
      })),
    };
  } catch {
    return fallback;
  }
}

function localizedBusinessLocation(locale: string, business: BusinessApiItem) {
  const matchedCity = business.matchedLocation?.city;
  if (matchedCity) {
    const name = locale === "fa" ? matchedCity.nameFa : matchedCity.nameEn;
    if (name) return name;
  }
  return getLocalizedName(locale, business.city);
}

export async function searchBusinessDirectory(
  locale: string,
  filters: BusinessDirectoryFilters,
  origin?: LocationOrigin,
  signal?: AbortSignal,
): Promise<BusinessDirectoryData> {
  const body: BusinessSearchBody & { favoritesOnly?: boolean } = {
    page: filters.page,
    limit: filters.limit,
    categoryId: filters.categoryId,
    subCategoryId: filters.subCategoryId,
    cityId: filters.cityId,
    search: filters.search,
    sortBy: filters.sortBy ?? "recommended",
    favoritesOnly: filters.favoritesOnly,
    origin,
    locale: locale as AppLocale,
  };
  let response: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetch("/api/businesses/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      if (response.ok || response.status < 500) break;
    } catch (error) {
      if ((error as Error).name === "AbortError" || attempt === 1) throw error;
    }
    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 350));
  }
  if (!response?.ok) throw new Error(`Business search failed (${response?.status ?? "network"})`);
  const json = (await response.json()) as PaginatedResponse<BusinessApiItem>;
  return {
    ...json.data,
    items: (json.data.items ?? []).map((business) => ({
      id: business.id,
      businessId: business.id,
      slug: business.slug,
      href: `/businesses/${business.slug}`,
      title: business.businessName,
      ...businessCardImageProps(business),
      shortDescription: business.shortDescription,
      categoryName: getLocalizedName(locale, business.category),
      categorySlug: business.category?.slug,
      categoryIconKey: business.category?.icon,
      rating: business.averageRating ?? 0,
      reviewCount: business.reviewCount ?? 0,
      location: localizedBusinessLocation(locale, business),
      distanceMeters: business.distanceMeters,
      matchedLocationName: business.matchedLocation?.type === "BRANCH" ? business.matchedLocation.name : null,
      featured: booleanFlag(business.featured),
      googlePlaceId: business.googlePlaceId,
    })),
  };
}

async function fetchDirectoryOptions(
  locale: string,
  path: string,
): Promise<DirectoryFilterOption[]> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = (await res.json()) as PaginatedResponse<DirectoryOptionApiItem>;
    return (json.data?.items ?? []).map((item) => ({
      id: item.id,
      slug: item.slug,
      name: getLocalizedName(locale, item) ?? item.nameEn,
      count: item._count?.businesses,
      iconKey: item.icon,
      parentId: item.category?.id,
      latitude: item.latitude,
      longitude: item.longitude,
    }));
  } catch {
    return [];
  }
}

export function fetchDirectoryCategories(locale: string) {
  return fetchDirectoryOptions(locale, "/v1/categories?limit=100&active=true");
}

export function fetchDirectorySubCategories(locale: string, categoryId?: number) {
  return fetchDirectoryOptions(
    locale,
    `/v1/sub-categories?limit=100&active=true${categoryId ? `&categoryId=${categoryId}` : ""}`,
  );
}

export function fetchDirectoryCities(locale: string) {
  return fetchDirectoryOptions(locale, "/v1/cities?limit=100");
}

function localizedText(locale: string, item?: { nameFa: string; nameEn: string } | null) {
  return getLocalizedName(locale, item);
}

export async function fetchBusinessBySlug(
  locale: string,
  slug: string,
): Promise<BusinessDetailData | null> {
  try {
    const localizedRes = await fetch(`${API_BASE}/v1/businesses/slug/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`, {
      cache: "no-store",
    });

    if (!localizedRes.ok) return null;

    const json = (await localizedRes.json()) as BusinessDetailApiResponse;
    const business = json.data;
    let gallery = (business.images ?? []).map((image) => ({
      id: image.id,
      imageUrl: image.imageUrl,
      caption: image.caption,
    }));

    if (gallery.length === 0 && business.coverImageUrl) {
      gallery.push({
        id: `${business.id}-cover`,
        imageUrl: business.coverImageUrl,
        caption: business.businessName,
      });
    }

    // Google photos are the automatic fallback. A manually managed gallery always wins.
    if (business.googlePlaceId && gallery.length === 0) {
      try {
        const googlePhotosRes = await fetch(
          `${API_BASE}/v1/businesses/${encodeURIComponent(business.id)}/google-photos`,
          { cache: "no-store" },
        );
        if (googlePhotosRes.ok) {
          const googleData = (await googlePhotosRes.json()) as {
            success: boolean;
            data: {
              photos: Array<{
                photoReference: string;
                width: number;
                height: number;
                htmlAttributions: string[];
              }>;
            };
          };
          const googlePhotos = googleData.data?.photos ?? [];
          if (googlePhotos.length > 0) {
            // Replace gallery with Google photos (at least 2 if available)
            gallery = googlePhotos.map((photo, index) => ({
              id: `google-${index}`,
              imageUrl: `/api/businesses/${encodeURIComponent(business.id)}/google-photos/${photo.photoReference}?maxWidth=800`,
              caption: photo.htmlAttributions[0] ?? business.businessName,
            }));
          }
        }
      } catch {
        // Fallback to local images silently
      }
    }

    return {
      id: business.id,
      slug: business.slug,
      title: business.businessName,
      legalName: business.legalName,
      shortDescription: business.shortDescription,
      description: business.description,
      logoUrl: business.logoUrl,
      coverImageUrl: business.coverImageUrl,
      googlePlaceId: business.googlePlaceId,
      gallery,
      categoryName: localizedText(locale, business.category),
      categoryId: business.category?.id,
      categorySlug: business.category?.slug,
      categoryIconKey: business.category?.icon,
      subCategoryName: localizedText(locale, business.subCategory),
      specialtyName: localizedText(locale, business.specialty),
      cityId: business.city?.id,
      location: localizedText(locale, business.city),
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
      rating: business.averageRating ?? 0,
      reviewCount: business.reviewCount ?? 0,
      verified: Boolean(business.verified),
      featured: booleanFlag(business.featured),
      hasOwner: Boolean(business.owner),
      hours: (business.businessHours ?? []).map((hour) => ({
        dayOfWeek: hour.dayOfWeek,
        openTime: hour.openTime,
        closeTime: hour.closeTime,
        isClosed: hour.isClosed,
        note: hour.note,
      })),
      tags: (business.tags ?? []).map((entry) => localizedText(locale, entry.tag) ?? entry.tag.nameEn),
      attributes: (business.attributes ?? []).flatMap((entry) => {
        if (!compatibleAttributeValue(entry.attribute.dataType, entry.value)) return [];
        return [{
          id: entry.attribute.id,
          key: entry.attribute.key,
          label: locale === "fa"
            ? entry.attribute.labelFa
            : locale === "de"
              ? entry.attribute.labelDe || entry.attribute.labelEn || entry.attribute.labelFa
              : entry.attribute.labelEn || entry.attribute.labelDe || entry.attribute.labelFa,
          value: entry.value,
          dataType: entry.attribute.dataType,
          unit: entry.attribute.unit,
        }];
      }),
      services: (business.services ?? []).map((service) => ({
        id: service.id,
        title: service.title,
        description: service.description,
        price: service.price,
        currency: service.currency,
        duration: service.duration,
        unit: service.unit,
      })),
    };
  } catch {
    return null;
  }
}

export async function fetchBusinessReviews(businessId: string): Promise<BusinessReviewItem[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/businesses/${businessId}/reviews?limit=50&status=APPROVED`, {
      cache: "no-store",
    });
    if (!res.ok) return [];

    const json = (await res.json()) as PaginatedResponse<ReviewApiItem>;
    return (json.data?.items ?? []).map((review) => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      createdAt: review.createdAt,
      visitDate: review.visitDate,
      verified: Boolean(review.verified),
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
            createdAt: review.ownerReply.createdAt,
            ownerName: review.ownerReply.owner?.name?.trim() || "Business owner",
            ownerAvatarUrl: review.ownerReply.owner?.avatarUrl,
          }
        : null,
    }));
  } catch {
    return [];
  }
}
