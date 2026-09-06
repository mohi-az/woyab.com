import type { BusinessDirectoryFilters } from "@/lib/api";

export type DirectoryDefaults = Pick<BusinessDirectoryFilters, "cityId" | "categoryId" | "subCategoryId">;
export type DirectoryRoute = { pathname: string; defaults: DirectoryDefaults; title: string; description: string };

// Missing query fields inherit the landing page scope. Explicit zero clears it.
export function applyDirectoryDefaults(filters: BusinessDirectoryFilters, params: Pick<URLSearchParams, "get">, defaults?: DirectoryDefaults): BusinessDirectoryFilters {
  if (!defaults) return filters;
  const result = { ...filters };
  for (const key of ["cityId", "categoryId", "subCategoryId"] as const) {
    if (params.get(key) === null) result[key] = defaults[key];
  }
  return result;
}

export function directoryRouteQuery(query: string, filters: BusinessDirectoryFilters, defaults?: DirectoryDefaults) {
  if (!defaults) return query;
  const params = new URLSearchParams(query);
  for (const key of ["cityId", "categoryId", "subCategoryId"] as const) {
    if (filters[key] === defaults[key]) params.delete(key);
    else params.set(key, String(filters[key] || 0));
  }
  return params.toString();
}

export function matchesDirectoryScope(filters: BusinessDirectoryFilters, defaults: DirectoryDefaults) {
  return (["cityId", "categoryId", "subCategoryId"] as const).every((key) => filters[key] === defaults[key]);
}
type SearchParamsReader = Pick<URLSearchParams, "get" | "getAll">;

function positiveIntParam(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function filtersFromSearchParams(params: SearchParamsReader, limit: number): BusinessDirectoryFilters {
  const sortBy = params.get("sortBy");
  return {
    page: positiveIntParam(params.get("page")) ?? 1,
    limit,
    search: params.get("search")?.trim() || undefined,
    categoryId: positiveIntParam(params.get("categoryId")),
    subCategoryId: positiveIntParam(params.get("subCategoryId")),
    tagIds: [...new Set(params.getAll("tagIds").flatMap((value) => value.split(","))
      .map(Number).filter((value) => Number.isInteger(value) && value > 0))],
    cityId: positiveIntParam(params.get("cityId")),
    sortBy: sortBy === "latest" || sortBy === "oldest" || sortBy === "popular" ? sortBy : "popular",
    favoritesOnly: params.get("favoritesOnly") === "true" || undefined,
    openNow: params.get("openNow") === "true" || undefined,
  };
}

export function filtersQuery(filters: BusinessDirectoryFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.categoryId) params.set("categoryId", String(filters.categoryId));
  if (filters.subCategoryId) params.set("subCategoryId", String(filters.subCategoryId));
  for (const tagId of filters.tagIds ?? []) params.append("tagIds", String(tagId));
  if (filters.cityId) params.set("cityId", String(filters.cityId));
  if (filters.sortBy && filters.sortBy !== "popular") params.set("sortBy", filters.sortBy);
  if (filters.favoritesOnly) params.set("favoritesOnly", "true");
  if (filters.openNow) params.set("openNow", "true");
  if (filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}
