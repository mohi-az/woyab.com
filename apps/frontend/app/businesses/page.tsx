import { getLocale, getTranslations } from "next-intl/server";
import { BusinessDirectory } from "@/features/businesses/BusinessDirectory";
import { isAppLocale } from "@/i18n/config";
import {
  fetchBusinessDirectory,
  type BusinessDirectoryFilters,
} from "@/lib/api";
import { fetchBusinessDirectoryOptions } from "@/lib/business-directory-options";
import { appLocale as toAppLocale, publicMetadata } from "@/lib/seo";
import { getBusinessDirectoryLabels } from "@/lib/business-directory-labels";

const PAGE_SIZE = 9;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInt(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function positiveInts(value: string | string[] | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(values.flatMap((item) => item.split(",")).map(Number)
    .filter((item) => Number.isInteger(item) && item > 0))];
}

function directorySort(value: string | undefined): BusinessDirectoryFilters["sortBy"] {
  return value === "latest" || value === "oldest" || value === "popular" ? value : "popular";
}

export async function generateMetadata({ searchParams }: PageProps) {
  const params = await searchParams;
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Businesses")]);
  const metadata = publicMetadata({
    locale: toAppLocale(locale),
    pathname: "/businesses",
    title: t("title"),
    description: t("description"),
  });
  // Curated /directory pages handle local search discovery; arbitrary search,
  // map, sorting and personal filters should not create indexable duplicates.
  return Object.keys(params).length
    ? { ...metadata, robots: { index: false, follow: true } }
    : metadata;
}

export default async function BusinessesPage({ searchParams }: PageProps) {
  const [params, requestedLocale] = await Promise.all([
    searchParams,
    getLocale(),
  ]);
  const locale = isAppLocale(requestedLocale) ? requestedLocale : "de";
  const filters: BusinessDirectoryFilters = {
    page: positiveInt(first(params.page)) ?? 1,
    limit: PAGE_SIZE,
    search: first(params.search)?.trim() || undefined,
    categoryId: positiveInt(first(params.categoryId)),
    subCategoryId: positiveInt(first(params.subCategoryId)),
    tagIds: positiveInts(params.tagIds),
    cityId: positiveInt(first(params.cityId)),
    sortBy: directorySort(first(params.sortBy)),
    favoritesOnly: first(params.favoritesOnly) === "true" || undefined,
    openNow: first(params.openNow) === "true" || undefined,
  };

  const [directory, filterOptions] = await Promise.all([
    fetchBusinessDirectory(locale, filters),
    fetchBusinessDirectoryOptions(locale, filters),
  ]);

  return (
    <div className="min-h-screen bg-white">
      <BusinessDirectory
        locale={locale}
        initialFilters={filters}
        initialDirectory={directory}
        categories={filterOptions.categories}
        subCategories={filterOptions.subCategories}
        tags={filterOptions.tags}
        cities={filterOptions.cities}
        labels={await getBusinessDirectoryLabels()}
      />
    </div>
  );
}
