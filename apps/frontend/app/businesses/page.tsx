import { getLocale, getTranslations } from "next-intl/server";
import { BusinessDirectory } from "@/features/businesses/BusinessDirectory";
import { isAppLocale } from "@/i18n/config";
import {
  fetchBusinessDirectory,
  fetchDirectoryCategories,
  fetchDirectoryCities,
  fetchDirectorySubCategories,
  type BusinessDirectoryFilters,
} from "@/lib/api";
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

export async function generateMetadata() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Businesses")]);
  return publicMetadata({
    locale: toAppLocale(locale),
    pathname: "/businesses",
    title: t("title"),
    description: t("description"),
  });
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
    cityId: positiveInt(first(params.cityId)),
    sortBy: first(params.sortBy) === "latest" ? "latest" : undefined,
    favoritesOnly: first(params.favoritesOnly) === "true" || undefined,
    openNow: first(params.openNow) === "true" || undefined,
  };

  const [directory, categories, subCategories, cities] = await Promise.all([
    fetchBusinessDirectory(locale, filters),
    fetchDirectoryCategories(locale),
    fetchDirectorySubCategories(locale),
    fetchDirectoryCities(locale),
  ]);

  return (
    <div className="min-h-screen bg-[#f8f5f1]">
      <section className="hero-theme relative isolate -mt-16 overflow-hidden px-4 pb-14 pt-28 text-white sm:px-6 sm:pb-18 sm:pt-32 lg:-mt-[4.75rem] lg:pt-36">
        <div className="absolute inset-0 bg-slate-950/88" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(241,91,63,.2),transparent_30%)]" />
        <div className="relative mx-auto max-w-[1480px]">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.22em] text-primary-light">{t("eyebrow")}</p>
          <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">{t("title")}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">{t("description")}</p>
        </div>
      </section>

      <BusinessDirectory
        locale={locale}
        initialFilters={filters}
        initialDirectory={directory}
        categories={categories}
        subCategories={subCategories}
        cities={cities}
        labels={{
          resultCount: t("resultCountTemplate", { count: "{count}" }),
          resultCountOne: t("resultCount", { count: 1 }),
          resultCountEmpty: t("resultCount", { count: 0 }),
          showing: t("showing", { from: "{from}", to: "{to}" }),
          loading: t("loading"),
          error: t("error"),
          retry: t("retry"),
          sort: {
            label: t("sort.label"),
            recommended: t("sort.recommended"),
            latest: t("sort.latest"),
            nearest: t("sort.nearest"),
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
          filters: {
            title: t("filters.title"),
            search: t("filters.search"),
            searchPlaceholder: t("filters.searchPlaceholder"),
            categories: t("filters.categories"),
            allCategories: t("filters.allCategories"),
            subCategories: t("filters.subCategories"),
            allSubCategories: t("filters.allSubCategories"),
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
