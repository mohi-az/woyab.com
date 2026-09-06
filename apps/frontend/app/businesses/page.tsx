import { getLocale, getTranslations } from "next-intl/server";
import { BusinessDirectory } from "@/features/businesses/BusinessDirectory";
import { isAppLocale } from "@/i18n/config";
import {
  fetchBusinessDirectory,
  type BusinessDirectoryFilters,
} from "@/lib/api";
import { fetchBusinessDirectoryOptions } from "@/lib/business-directory-options";
import { appLocale as toAppLocale, publicMetadata } from "@/lib/seo";

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
  const [params, requestedLocale, t] = await Promise.all([
    searchParams,
    getLocale(),
    getTranslations("Businesses"),
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
        labels={{
          eyebrow: t("eyebrow"),
          title: t("title"),
          resultCount: t("resultCountTemplate", { count: "{count}" }),
          resultCountOne: t("resultCount", { count: 1 }),
          resultCountEmpty: t("resultCount", { count: 0 }),
          showing: t("showing", { from: "{from}", to: "{to}" }),
          loading: t("loading"),
          error: t("error"),
          retry: t("retry"),
          sort: {
            label: t("sort.label"),
            latest: t("sort.latest"),
            oldest: t("sort.oldest"),
            popular: t("sort.popular"),
          },
          card: {
            favorite: t("card.favorite"),
            reviews: t("card.reviewsTemplate", { count: "{count}" }),
            unknownLocation: t("card.unknownLocation"),
            distance: t("card.distance", { distance: "{distance}" }),
            featured: t("card.featured"),
            openNow: t("card.openNow"),
            closed: t("card.closed"),
            openSoon: t("card.openSoon", { time: "{time}" }),
            closeSoon: t("card.closeSoon", { time: "{time}" }),
          },
          empty: { title: t("empty.title"), description: t("empty.description") },
          pagination: {
            label: t("pagination.label"),
            previous: t("pagination.previous"),
            next: t("pagination.next"),
          },
          map: {
            show: t("map.show"),
            hide: t("map.hide"),
            title: t("map.title"),
            loading: t("map.loading"),
            error: t("map.error"),
            truncated: t("map.truncated"),
            clusterResults: t("map.clusterResults", { count: "{count}" }),
            viewBusiness: t("map.viewBusiness"),
            reviews: t("map.reviews"),
            directions: t("map.directions"),
          },
          allFilters: t("filters.all"),
          closeFilters: t("filters.close"),
          filters: {
            title: t("filters.title"),
            search: t("filters.search"),
            searchPlaceholder: t("filters.searchPlaceholder"),
            categories: t("filters.categories"),
            allCategories: t("filters.allCategories"),
            subCategories: t("filters.subCategories"),
            allSubCategories: t("filters.allSubCategories"),
            tags: t("filters.tags"),
            allTags: t("filters.allTags"),
            showAll: t("filters.showAll"),
            showLess: t("filters.showLess"),
            city: t("filters.city"),
            allCities: t("filters.allCities"),
            location: t("filters.location"),
            favoritesOnly: t("filters.favoritesOnly"),
            openNow: t("filters.openNow"),
            reset: t("filters.reset"),
            locationPicker: {
              inputLabel: t("location.inputLabel"),
              placeholder: t("location.placeholder"),
              useCurrentLocation: t("location.useCurrentLocation"),
              locating: t("location.locating"),
              currentLocation: t("location.currentLocation"),
              savedLocations: t("location.savedLocations"),
              radius: t("location.radius"),
              anyDistance: t("location.anyDistance"),
              radiusHint: t("location.radiusHint"),
              clear: t("location.clear"),
              unavailable: t("location.unavailable"),
              permissionDenied: t("location.permissionDenied"),
              timeout: t("location.timeout"),
              noResults: t("location.noResults"),
            },
          },
        }}
      />
    </div>
  );
}
