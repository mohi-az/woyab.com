type CategoryApiItem = {
  id: number;
  _count: { businesses: number; subCategories: number };
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
  } | null;
  city?: {
    nameFa: string;
    nameEn: string;
    slug: string;
  } | null;
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

export type LatestBusinessCardItem = {
  id: string;
  href: string;
  title: string;
  imageUrl?: string | null;
  shortDescription?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  location?: string | null;
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
      rating: business.averageRating ?? 0,
      reviewCount: business.reviewCount ?? 0,
      location: getLocalizedName(locale, business.city),
    }));
  } catch {
    return [];
  }
}
