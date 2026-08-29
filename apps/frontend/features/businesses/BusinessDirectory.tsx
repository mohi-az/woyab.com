"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiHeart,
  FiInbox,
  FiLoader,
  FiMap,
  FiMapPin,
  FiRefreshCw,
  FiSliders,
  FiX,
} from "react-icons/fi";
import { BusinessCard } from "@/components/business/BusinessCard";
import { BusinessFilters, type BusinessFilterLabels } from "@/components/business/BusinessFilters";
import { BusinessMap, type BusinessMapLabels } from "@/components/business/BusinessMap";
import { BusinessReveal } from "@/components/business/BusinessReveal";
import { BusinessSort } from "@/components/business/BusinessSort";
import type { LocationValue, RadiusKm, SavedLocationOption } from "@/components/location/LocationPicker";
import {
  searchBusinessDirectory,
  type BusinessDirectoryData,
  type BusinessDirectoryFilterOptions,
  type BusinessDirectoryFilters,
  type DirectoryFilterOption,
} from "@/lib/api";

type Labels = {
  eyebrow: string;
  title: string;
  resultCount: string;
  resultCountOne: string;
  resultCountEmpty: string;
  showing: string;
  loading: string;
  error: string;
  retry: string;
  sort: {
    label: string;
    latest: string;
    oldest: string;
    popular: string;
  };
  card: {
    favorite: string;
    reviews: string;
    unknownLocation: string;
    distance: string;
    featured: string;
    openNow: string;
    closed: string;
    openSoon: string;
    closeSoon: string;
  };
  empty: { title: string; description: string };
  pagination: { label: string; previous: string; next: string };
  filters: BusinessFilterLabels;
  allFilters: string;
  closeFilters: string;
  map: BusinessMapLabels & { show: string; hide: string };
};

type Props = {
  locale: "de" | "en" | "fa";
  initialFilters: BusinessDirectoryFilters;
  initialDirectory: BusinessDirectoryData;
  categories: DirectoryFilterOption[];
  subCategories: DirectoryFilterOption[];
  tags: DirectoryFilterOption[];
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
  tags,
  cities,
  labels,
}: Props) {
  const [filters, setFilters] = useState(initialFilters);
  const [directory, setDirectory] = useState(initialDirectory);
  const [filterOptions, setFilterOptions] = useState<BusinessDirectoryFilterOptions>({
    categories,
    subCategories,
    tags,
    cities,
  });
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [radiusKm, setRadiusKm] = useState<RadiusKm | null>(5);
  // The directory refreshes once after hydration. Start in a loading state so
  // an empty SSR fallback is never presented as a confirmed empty result.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [highlightedBusinessId, setHighlightedBusinessId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const filtersButtonRef = useRef<HTMLButtonElement>(null);
  const filtersDrawerRef = useRef<HTMLElement>(null);
  const filtersContentRef = useRef<HTMLDivElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const [favoriteBusinessIds, setFavoriteBusinessIds] = useState<Set<string>>(new Set());
  const [savedLocations, setSavedLocations] = useState<Array<SavedLocationOption & { isDefault?: boolean }>>([]);
  const [now, setNow] = useState(() => new Date());
  const openNowRefreshKey = filters.openNow ? Math.floor(now.getTime() / 60_000) : 0;
  const filterOptionsQuery = (() => {
    const params = new URLSearchParams({ locale });
    if (filters.categoryId) params.set("categoryId", String(filters.categoryId));
    if (filters.subCategoryId) params.set("subCategoryId", String(filters.subCategoryId));
    if (filters.cityId) params.set("cityId", String(filters.cityId));
    for (const tagId of filters.tagIds ?? []) params.append("tagIds", String(tagId));
    return params.toString();
  })();

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;

    const previousOverflow = document.body.style.overflow;
    const filtersButton = filtersButtonRef.current;
    document.body.style.overflow = "hidden";
    if (filtersContentRef.current) filtersContentRef.current.scrollTop = 0;
    drawerCloseRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFiltersOpen(false);
        return;
      }
      if (event.key !== "Tab" || !filtersDrawerRef.current) return;

      const focusable = [...filtersDrawerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )].filter((element) => !element.hasAttribute("hidden"));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      filtersButton?.focus();
    };
  }, [filtersOpen]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/account/directory-context", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then(({ data }) => {
        setFavoriteBusinessIds(new Set<string>(data.favoriteBusinessIds ?? []));
        setSavedLocations((data.savedLocations ?? []).map((item: { id: string; label: string; icon: SavedLocationOption["icon"]; latitude: number; longitude: number; isDefault?: boolean }) => ({
          id: item.id,
          source: "SAVED" as const,
          label: item.label,
          icon: item.icon,
          latitude: item.latitude,
          longitude: item.longitude,
          isDefault: item.isDefault,
        })));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/businesses/filter-options?${filterOptionsQuery}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Filter options request failed");
        return response.json() as Promise<{ data?: BusinessDirectoryFilterOptions }>;
      })
      .then(({ data }) => {
        if (data && !controller.signal.aborted) setFilterOptions(data);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [filterOptionsQuery]);

  const changeFilters = useCallback((patch: Partial<BusinessDirectoryFilters>) => {
    setFilters((current) => ({ ...current, ...patch, page: 1 }));
  }, []);

  const changeLocation = useCallback((nextLocation: LocationValue | null) => {
    setLocation(nextLocation);
    setFilters((current) => ({
      ...current,
      page: 1,
      cityId: nextLocation ? undefined : current.cityId,
    }));
  }, []);

  const changeRadius = useCallback((radius: RadiusKm | null) => {
    setRadiusKm(radius);
    setFilters((current) => ({ ...current, page: 1 }));
  }, []);

  const reset = useCallback(() => {
    setFilters((current) => ({
      page: 1,
      limit: initialFilters.limit,
      sortBy: current.sortBy ?? "popular",
      cityId: current.cityId,
    }));
  }, [initialFilters.limit]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.categoryId) params.set("categoryId", String(filters.categoryId));
    if (filters.subCategoryId) params.set("subCategoryId", String(filters.subCategoryId));
    for (const tagId of filters.tagIds ?? []) params.append("tagIds", String(tagId));
    if (filters.cityId) params.set("cityId", String(filters.cityId));
    if (filters.sortBy && filters.sortBy !== "popular") params.set("sortBy", filters.sortBy);
    if (filters.page > 1) params.set("page", String(filters.page));
    const query = params.toString();
    const path = `/${locale}/businesses`;
    window.history.replaceState(null, "", query ? `${path}?${query}` : path);
  }, [filters, locale]);

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
  }, [filters, labels.error, locale, location, openNowRefreshKey, radiusKm, retryCount]);

  const currentPage = directory.totalPages > 0 ? Math.min(directory.page, directory.totalPages) : 1;
  const pages = visiblePages(currentPage, directory.totalPages);
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const activeFilterCount = [
    filters.search,
    filters.categoryId,
    filters.subCategoryId,
    filters.tagIds?.length,
    filters.cityId,
    filters.favoritesOnly,
    filters.openNow,
    location,
  ].filter(Boolean).length;
  const hasClearableFilters = Boolean(
    filters.search
    || filters.categoryId
    || filters.subCategoryId
    || filters.tagIds?.length
    || filters.favoritesOnly
    || filters.openNow,
  );

  return (
    <section className="mx-auto max-w-[1920px] bg-white">
      <div className="lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(420px,1fr)] xl:grid-cols-[minmax(0,1.45fr)_minmax(520px,1fr)]">
        <div className="min-w-0 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:px-12">
          <header className="mb-7">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-primary">{labels.eyebrow}</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{labels.title}</h1>
          </header>

          <div className="relative z-30 mb-7 border-b border-slate-200 pb-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              {loading && directory.total === 0 ? (
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500">
                  <FiLoader className="animate-spin text-primary" />
                  {labels.loading}
                </span>
              ) : directory.total > 0 ? (
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500">
                  <span>
                    {(directory.total === 1 ? labels.resultCountOne : labels.resultCount)
                      .replace("{count}", numberFormat.format(directory.total))}
                  </span>
                  <span aria-hidden="true" className="text-gray-300">&bull;</span>
                  <span>
                    {labels.showing
                      .replace("{from}", String((currentPage - 1) * directory.limit + 1))
                      .replace("{to}", String(Math.min(currentPage * directory.limit, directory.total)))}
                  </span>
                </div>
              ) : (
                <span className="text-xs font-semibold text-gray-500">{labels.resultCountEmpty}</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div>
                <button
                  ref={filtersButtonRef}
                  type="button"
                  onClick={() => setFiltersOpen((open) => !open)}
                  aria-expanded={filtersOpen}
                  aria-haspopup="dialog"
                  className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 ${filtersOpen || activeFilterCount > 0 ? "border-primary bg-primary/5 text-primary" : "border-slate-300 bg-white text-slate-800 hover:border-primary hover:text-primary"}`}
                >
                  <FiSliders />
                  {labels.allFilters}
                  {activeFilterCount > 0 ? (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] text-white">{activeFilterCount}</span>
                  ) : null}
                </button>
              </div>

              <BusinessSort
                value={filters.sortBy ?? "popular"}
                label={labels.sort.label}
                latestLabel={labels.sort.latest}
                oldestLabel={labels.sort.oldest}
                popularLabel={labels.sort.popular}
                onChange={(sortBy) => changeFilters({ sortBy })}
              />
              <QuickSelect
                label={labels.filters.city}
                value={filters.cityId}
                onChange={(value) => changeFilters({ cityId: value })}
                options={filterOptions.cities}
                allLabel={labels.filters.allCities}
              />
              <button
                type="button"
                aria-pressed={Boolean(filters.openNow)}
                onClick={() => changeFilters({ openNow: filters.openNow ? undefined : true })}
                className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 ${filters.openNow ? "border-primary bg-primary/5 text-primary" : "border-slate-300 bg-white text-slate-800 hover:border-primary hover:text-primary"}`}
              >
                <FiClock aria-hidden="true" className="text-primary" /> {labels.filters.openNow}
              </button>
              <button
                type="button"
                aria-pressed={Boolean(filters.favoritesOnly)}
                onClick={() => changeFilters({ favoritesOnly: filters.favoritesOnly ? undefined : true })}
                className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 ${filters.favoritesOnly ? "border-primary bg-primary/5 text-primary" : "border-slate-300 bg-white text-slate-800 hover:border-primary hover:text-primary"}`}
              >
                <FiHeart aria-hidden="true" className="text-primary" /> {labels.filters.favoritesOnly}
              </button>
              <button
                type="button"
                onClick={() => setMapOpen((open) => !open)}
                aria-expanded={mapOpen}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 lg:hidden ${mapOpen ? "border-primary bg-primary/5 text-primary" : "border-slate-300 bg-white text-slate-800 hover:border-primary hover:text-primary"}`}
              >
                <FiMap />
                {mapOpen ? labels.map.hide : labels.map.show}
              </button>
              {hasClearableFilters ? (
                <button
                  type="button"
                  onClick={reset}
                  className="px-1 text-sm font-semibold text-slate-500 underline-offset-4 transition hover:text-primary hover:underline focus-visible:outline-none focus-visible:text-primary focus-visible:underline"
                >
                  {labels.filters.reset}
                </button>
              ) : null}
            </div>
          </div>

          {filtersOpen ? (
            <div
              role="presentation"
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) setFiltersOpen(false);
              }}
              className="fixed inset-0 z-[100] bg-slate-950/35 backdrop-blur-[1px]"
            >
              <aside
                ref={filtersDrawerRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="business-filters-title"
                className="absolute inset-y-0 start-0 flex h-dvh w-full flex-col bg-white shadow-[0_24px_80px_rgba(15,23,42,.28)] sm:w-[min(24rem,85vw)] lg:w-[20vw] lg:min-w-[320px]"
              >
                <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5">
                  <h2 id="business-filters-title" className="text-base font-bold text-slate-900">{labels.filters.title}</h2>
                  <button
                    ref={drawerCloseRef}
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    aria-label={labels.closeFilters}
                    className="grid h-10 w-10 place-items-center rounded-full text-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                  >
                    <FiX aria-hidden="true" />
                  </button>
                </header>
                <div ref={filtersContentRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  <BusinessFilters
                    variant="drawer"
                    filters={filters}
                    categories={filterOptions.categories}
                    subCategories={filterOptions.subCategories}
                    tags={filterOptions.tags}
                    cities={filterOptions.cities}
                    labels={labels.filters}
                    locale={locale}
                    location={location}
                    radiusKm={radiusKm}
                    onFiltersChange={changeFilters}
                    onLocationChange={changeLocation}
                    onRadiusChange={changeRadius}
                    onReset={() => {
                      reset();
                      setFiltersOpen(false);
                    }}
                    showReset={hasClearableFilters}
                    savedLocations={savedLocations}
                  />
                </div>
              </aside>
            </div>
          ) : null}

          {!isDesktop && mapOpen ? (
            <div className="mb-7">
              <BusinessMap
                filters={filters}
                location={location}
                radiusKm={radiusKm}
                locale={locale}
                labels={labels.map}
                favoriteBusinessIds={favoriteBusinessIds}
                savedLocations={savedLocations}
                refreshKey={openNowRefreshKey}
              />
            </div>
          ) : null}

          {error ? (
            <div role="alert" className="mb-5 flex flex-wrap items-center gap-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setRetryCount((c) => c + 1)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 font-medium text-red-800 transition hover:bg-red-200"
              >
                <FiRefreshCw className="h-4 w-4" />
                {labels.retry}
              </button>
            </div>
          ) : null}

          <div className={`relative ${error && directory.items.length === 0 ? "" : "min-h-80"}`} aria-busy={loading}>
            {directory.items.length > 0 ? (
              <div className={`grid grid-cols-1 gap-6 transition-opacity sm:grid-cols-2 ${loading ? "opacity-50" : "opacity-100"}`}>
                {directory.items.map((business, index) => {
                  const distanceLabel = business.distanceMeters == null
                    ? null
                    : labels.card.distance.replace("{distance}", numberFormat.format(business.distanceMeters / 1000));
                  return (
                    <div
                      key={business.id}
                      onMouseEnter={() => {
                        if (isDesktop) setHighlightedBusinessId(business.businessId);
                      }}
                      onMouseLeave={() => {
                        if (isDesktop) setHighlightedBusinessId(null);
                      }}
                      onFocus={() => {
                        if (isDesktop) setHighlightedBusinessId(business.businessId);
                      }}
                      onBlur={(event) => {
                        if (isDesktop && (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget))) {
                          setHighlightedBusinessId(null);
                        }
                      }}
                    >
                      <BusinessReveal delay={(index % 2) * 90}>
                        <BusinessCard
                          {...business}
                          favoriteLabel={labels.card.favorite}
                          reviewsLabel={labels.card.reviews}
                          locationFallback={labels.card.unknownLocation}
                          distanceLabel={distanceLabel}
                          featuredLabel={labels.card.featured}
                          openStatusLabels={{
                            OPEN: labels.card.openNow,
                            CLOSED: labels.card.closed,
                            OPEN_SOON: labels.card.openSoon,
                            CLOSE_SOON: labels.card.closeSoon,
                          }}
                          now={now}
                          isFavorite={favoriteBusinessIds.has(business.businessId)}
                          onFavoriteChange={(saved) => setFavoriteBusinessIds((current) => {
                            const next = new Set(current);
                            if (saved) next.add(business.businessId);
                            else next.delete(business.businessId);
                            return next;
                          })}
                        />
                      </BusinessReveal>
                    </div>
                  );
                })}
              </div>
            ) : loading ? (
              <div role="status" className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <FiLoader className="mb-4 animate-spin text-5xl text-primary" />
                <p className="text-sm font-bold text-gray-600">{labels.loading}</p>
              </div>
            ) : !error ? (
              <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                <FiInbox className="mb-4 text-5xl text-primary/70" />
                <h2 className="text-xl font-extrabold text-gray-900">{labels.empty.title}</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">{labels.empty.description}</p>
              </div>
            ) : null}
            {loading && directory.items.length > 0 ? (
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

        {isDesktop ? (
          <aside className="sticky top-[4.75rem] self-start">
            <BusinessMap
              filters={filters}
              location={location}
              radiusKm={radiusKm}
              locale={locale}
              labels={labels.map}
              favoriteBusinessIds={favoriteBusinessIds}
              savedLocations={savedLocations}
              refreshKey={openNowRefreshKey}
              highlightedBusinessId={highlightedBusinessId}
              className="rounded-none border-y-0 border-e-0 shadow-none"
              mapClassName="h-[calc(100dvh-4.75rem)] min-h-[560px]"
            />
          </aside>
        ) : null}
      </div>
    </section>
  );
}

function QuickSelect({
  label,
  value,
  options,
  allLabel,
  onChange,
}: {
  label: string;
  value?: number;
  options: DirectoryFilterOption[];
  allLabel: string;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <label className="relative inline-flex h-11 items-center rounded-full border border-slate-300 bg-white text-sm font-bold text-slate-800 transition hover:border-primary hover:text-primary focus-within:border-primary focus-within:text-primary focus-within:ring-4 focus-within:ring-primary/15">
      <span className="sr-only">{label}</span>
      <FiMapPin aria-hidden="true" className="pointer-events-none absolute start-4 text-base text-primary" />
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : undefined)}
        className="h-full max-w-48 cursor-pointer appearance-none rounded-full bg-transparent ps-11 pe-10 font-bold outline-none"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
      <FiChevronDown aria-hidden="true" className="pointer-events-none absolute end-3 text-sm text-slate-500" />
    </label>
  );
}

function PageButton({ disabled, label, onClick, children }: { disabled: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-label={label} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:border-primary hover:text-primary disabled:border-gray-100 disabled:bg-gray-50 disabled:text-gray-300">
      {children}
    </button>
  );
}
