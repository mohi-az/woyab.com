type CategoryApiItem = {
  id: number;
  _count: { businesses: number; subCategories: number };
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

const API_BASE = process.env.API_URL ?? "http://localhost:4000";

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
