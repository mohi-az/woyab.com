"use client";

import { useCallback, useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiInbox, FiLoader, FiMap } from "react-icons/fi";
import { BusinessCard } from "@/components/business/BusinessCard";
import { BusinessFilters, type BusinessFilterLabels } from "@/components/business/BusinessFilters";
import { BusinessMap, type BusinessMapLabels } from "@/components/business/BusinessMap";
import { BusinessReveal } from "@/components/business/BusinessReveal";
import { BusinessSort } from "@/components/business/BusinessSort";
import type { LocationValue, RadiusKm } from "@/components/location/LocationPicker";
import {
  searchBusinessDirectory,
  type BusinessDirectoryData,
  type BusinessDirectoryFilters,
  type DirectoryFilterOption,
} from "@/lib/api";

type Labels = {
  resultCount: string;
  resultCountOne: string;
  resultCountEmpty: string;
  showing: string;
  loading: string;
  error: string;
  sort: {
    label: string;
    recommended: string;
    latest: string;
    nearest: string;
  };
  card: {
    favorite: string;
    reviews: string;
    unknownLocation: string;
    distance: string;
  };
  empty: { title: string; description: string };
  pagination: { label: string; previous: string; next: string };
  filters: BusinessFilterLabels;
  map: BusinessMapLabels & { show: string; hide: string };
};

type Props = {
  locale: "de" | "en" | "fa";
  initialFilters: BusinessDirectoryFilters;
  initialDirectory: BusinessDirectoryData;
  categories: DirectoryFilterOption[];
  subCategories: DirectoryFilterOption[];
  cities: DirectoryFilterOption[];
  labels: Labels;
};

function visiblePages(current: number, total: number) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  return [...pages].filter((page) => page > 0 && page <= total).sort((a, b) => a - b);
}

export function BusinessDirectory({
  locale,
  initialFilters,
  initialDirectory,
  categories,
  subCategories,
  cities,
  labels,
}: Props) {
  const [filters, setFilters] = useState(initialFilters);
  const [directory, setDirectory] = useState(initialDirectory);
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [radiusKm, setRadiusKm] = useState<RadiusKm | null>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetVersion, setResetVersion] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);

  const changeFilters = useCallback((patch: Partial<BusinessDirectoryFilters>) => {
    setFilters((current) => ({ ...current, ...patch, page: 1 }));
  }, []);

  const changeLocation = useCallback((nextLocation: LocationValue | null) => {
    setLocation(nextLocation);
    setFilters((current) => ({
      ...current,
      page: 1,
      cityId: nextLocation ? undefined : current.cityId,
      sortBy: nextLocation ? "distance" : current.sortBy === "distance" ? undefined : current.sortBy,
    }));
  }, []);

  const changeRadius = useCallback((radius: RadiusKm | null) => {
    setRadiusKm(radius);
    setFilters((current) => ({ ...current, page: 1 }));
  }, []);

  const reset = useCallback(() => {
    setLocation(null);
    setRadiusKm(5);
    setFilters({ page: 1, limit: initialFilters.limit });
    setResetVersion((version) => version + 1);
    sessionStorage.removeItem("fargo:business-search-location");
  }, [initialFilters.limit]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.categoryId) params.set("categoryId", String(filters.categoryId));
    if (filters.subCategoryId) params.set("subCategoryId", String(filters.subCategoryId));
    if (filters.cityId) params.set("cityId", String(filters.cityId));
    if (filters.sortBy === "latest") params.set("sortBy", "latest");
    if (filters.page > 1) params.set("page", String(filters.page));
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/businesses?${query}` : "/businesses");
  }, [filters]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setLoading(true);
        setError(null);
      }
    });
    const origin = location
      ? {
          latitude: location.latitude,
          longitude: location.longitude,
          ...(radiusKm !== null && { radiusKm }),
        }
      : undefined;

    void searchBusinessDirectory(locale, filters, origin, controller.signal)
      .then((result) => setDirectory(result))
      .catch((requestError) => {
        if ((requestError as Error).name !== "AbortError") setError(labels.error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [filters, labels.error, locale, location, radiusKm]);

  const currentPage = directory.totalPages > 0 ? Math.min(directory.page, directory.totalPages) : 1;
  const pages = visiblePages(currentPage, directory.totalPages);
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  return (
    <section className="mx-auto max-w-[1480px] px-4 py-10 sm:px-6 sm:py-14">
      {mapOpen ? (
        <div className="mb-8">
          <BusinessMap
            filters={filters}
            location={location}
            radiusKm={radiusKm}
            locale={locale}
            labels={labels.map}
          />
        </div>
      ) : null}
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[310px_minmax(0,1fr)]">
        <BusinessFilters
          filters={filters}
          categories={categories}
          subCategories={subCategories}
          cities={cities}
          labels={labels.filters}
          locale={locale}
          location={location}
          radiusKm={radiusKm}
          onFiltersChange={changeFilters}
          onLocationChange={changeLocation}
          onRadiusChange={changeRadius}
          onReset={reset}
          resetVersion={resetVersion}
          savedLocations={[]}
        />

        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,.05)]">
            <button
              type="button"
              onClick={() => setMapOpen((open) => !open)}
              aria-expanded={mapOpen}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-bold transition ${mapOpen ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary"}`}
            >
              <FiMap />
              {mapOpen ? labels.map.hide : labels.map.show}
            </button>
            <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
              {directory.total > 0 ? (
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500">
                  <span>
                    {(directory.total === 1 ? labels.resultCountOne : labels.resultCount)
                      .replace("{count}", numberFormat.format(directory.total))}
                  </span>
                  <span aria-hidden="true" className="text-gray-300">&bull;</span>
                  <span className="rounded-full bg-[#f8f5f1] px-4 py-2">
                    {labels.showing
                      .replace("{from}", String((currentPage - 1) * directory.limit + 1))
                      .replace("{to}", String(Math.min(currentPage * directory.limit, directory.total)))}
                  </span>
                </div>
              ) : (
                <span className="text-xs font-semibold text-gray-500">{labels.resultCountEmpty}</span>
              )}
              <BusinessSort
                value={filters.sortBy}
                locationActive={Boolean(location)}
                label={labels.sort.label}
                recommendedLabel={labels.sort.recommended}
                latestLabel={labels.sort.latest}
                nearestLabel={labels.sort.nearest}
                onChange={(sortBy) => changeFilters({ sortBy: sortBy === "recommended" ? undefined : sortBy })}
              />
            </div>
          </div>

          {error ? <p role="alert" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

          <div className="relative min-h-80" aria-busy={loading}>
            {directory.items.length > 0 ? (
              <div className={`grid grid-cols-1 gap-6 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${loading ? "opacity-50" : "opacity-100"}`}>
                {directory.items.map((business, index) => {
                  const distanceLabel = business.distanceMeters == null
                    ? null
                    : labels.card.distance.replace("{distance}", numberFormat.format(business.distanceMeters / 1000));
                  return (
                    <BusinessReveal key={business.id} delay={(index % 3) * 90}>
                      <BusinessCard
                        {...business}
                        favoriteLabel={labels.card.favorite}
                        reviewsLabel={labels.card.reviews}
                        locationFallback={labels.card.unknownLocation}
                        distanceLabel={distanceLabel}
                      />
                    </BusinessReveal>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                <FiInbox className="mb-4 text-5xl text-primary/70" />
                <h2 className="text-xl font-extrabold text-gray-900">{labels.empty.title}</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">{labels.empty.description}</p>
              </div>
            )}
            {loading ? (
              <div className="pointer-events-none absolute inset-x-0 top-5 flex justify-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-lg">
                  <FiLoader className="animate-spin text-primary" /> {labels.loading}
                </span>
              </div>
            ) : null}
          </div>

          {directory.totalPages > 1 ? (
            <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label={labels.pagination.label}>
              <PageButton disabled={currentPage <= 1} label={labels.pagination.previous} onClick={() => setFilters((current) => ({ ...current, page: currentPage - 1 }))}><FiChevronLeft /></PageButton>
              {pages.map((page, index) => (
                <span key={page} className="contents">
                  {index > 0 && page - pages[index - 1] > 1 ? <span className="px-1 text-gray-400">&hellip;</span> : null}
                  <button
                    type="button"
                    onClick={() => setFilters((current) => ({ ...current, page }))}
                    aria-current={page === currentPage ? "page" : undefined}
                    className={`inline-flex h-11 min-w-11 items-center justify-center rounded-xl border px-3 text-sm font-bold transition ${page === currentPage ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary"}`}
                  >{page}</button>
                </span>
              ))}
              <PageButton disabled={currentPage >= directory.totalPages} label={labels.pagination.next} onClick={() => setFilters((current) => ({ ...current, page: currentPage + 1 }))}><FiChevronRight /></PageButton>
            </nav>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function PageButton({ disabled, label, onClick, children }: { disabled: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-label={label} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:border-primary hover:text-primary disabled:border-gray-100 disabled:bg-gray-50 disabled:text-gray-300">
      {children}
    </button>
  );
}
