import type { BusinessSearchBody, LocationOrigin } from "@fargo/shared";

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
  shortDescription?: string | null;
  averageRating?: number | null;
  reviewCount?: number | null;
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
    logoUrl?: string | null;
    coverImageUrl?: string | null;
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
    postalCode?: string | null;
    establishedYear?: number | null;
    priceRange?: "BUDGET" | "MODERATE" | "EXPENSIVE" | "LUXURY" | null;
    averageRating?: number | null;
    reviewCount?: number | null;
    verified?: boolean;
    featured?: boolean;
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
  shortDescription?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  categoryIconKey?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  location?: string | null;
  distanceMeters?: number | null;
  matchedLocationName?: string | null;
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
  categoryName?: string | null;
  categorySlug?: string | null;
  categoryIconKey?: string | null;
  subCategoryName?: string | null;
  specialtyName?: string | null;
  location?: string | null;
  address?: string | null;
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
  hours: Array<{
    dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
    openTime?: string | null;
    closeTime?: string | null;
    isClosed: boolean;
    note?: string | null;
  }>;
  tags: string[];
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
};

export type CurrentUser = {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
};

const API_BASE = process.env.API_URL ?? "http://localhost:4000";

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
    const res = await fetch(`${API_BASE}/v1/businesses?limit=8&status=ACTIVE&sortBy=latest`, {
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
      imageUrl: business.coverImageUrl,
      shortDescription: business.shortDescription,
      categoryName: getLocalizedName(locale, business.category),
      categorySlug: business.category?.slug,
      categoryIconKey: business.category?.icon,
      rating: business.averageRating ?? 0,
      reviewCount: business.reviewCount ?? 0,
      location: getLocalizedName(locale, business.city),
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
    const res = await fetch(`${API_BASE}/v1/businesses?${directoryParams(filters)}`, {
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
        imageUrl: business.coverImageUrl,
        shortDescription: business.shortDescription,
        categoryName: getLocalizedName(locale, business.category),
        categorySlug: business.category?.slug,
        categoryIconKey: business.category?.icon,
        rating: business.averageRating ?? 0,
        reviewCount: business.reviewCount ?? 0,
        location: localizedBusinessLocation(locale, business),
        distanceMeters: business.distanceMeters,
        matchedLocationName: business.matchedLocation?.type === "BRANCH" ? business.matchedLocation.name : null,
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
  const body: BusinessSearchBody = {
    page: filters.page,
    limit: filters.limit,
    categoryId: filters.categoryId,
    subCategoryId: filters.subCategoryId,
    cityId: filters.cityId,
    search: filters.search,
    sortBy: filters.sortBy ?? "recommended",
    origin,
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
      imageUrl: business.coverImageUrl,
      shortDescription: business.shortDescription,
      categoryName: getLocalizedName(locale, business.category),
      categorySlug: business.category?.slug,
      categoryIconKey: business.category?.icon,
      rating: business.averageRating ?? 0,
      reviewCount: business.reviewCount ?? 0,
      location: localizedBusinessLocation(locale, business),
      distanceMeters: business.distanceMeters,
      matchedLocationName: business.matchedLocation?.type === "BRANCH" ? business.matchedLocation.name : null,
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
    const res = await fetch(`${API_BASE}/v1/businesses/slug/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;

    const json = (await res.json()) as BusinessDetailApiResponse;
    const business = json.data;
    const gallery = (business.images ?? []).map((image) => ({
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

    return {
      id: business.id,
      slug: business.slug,
      title: business.businessName,
      legalName: business.legalName,
      shortDescription: business.shortDescription,
      description: business.description,
      logoUrl: business.logoUrl,
      coverImageUrl: business.coverImageUrl,
      gallery,
      categoryName: localizedText(locale, business.category),
      categorySlug: business.category?.slug,
      categoryIconKey: business.category?.icon,
      subCategoryName: localizedText(locale, business.subCategory),
      specialtyName: localizedText(locale, business.specialty),
      location: localizedText(locale, business.city),
      address: business.address,
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
      featured: Boolean(business.featured),
      hours: (business.businessHours ?? []).map((hour) => ({
        dayOfWeek: hour.dayOfWeek,
        openTime: hour.openTime,
        closeTime: hour.closeTime,
        isClosed: hour.isClosed,
        note: hour.note,
      })),
      tags: (business.tags ?? []).map((entry) => localizedText(locale, entry.tag) ?? entry.tag.nameEn),
    };
  } catch {
    return null;
  }
}

export async function fetchBusinessReviews(businessId: string): Promise<BusinessReviewItem[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/businesses/${businessId}/reviews?limit=50`, {
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
    }));
  } catch {
    return [];
  }
}
