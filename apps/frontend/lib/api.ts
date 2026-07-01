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
      href: `/businesses?search=${encodeURIComponent(business.businessName)}`,
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
        href: `/businesses?search=${encodeURIComponent(business.businessName)}`,
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
      href: `/businesses?search=${encodeURIComponent(business.businessName)}`,
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
