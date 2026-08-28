"use client";

import { useRef, useState } from "react";
import { FiChevronDown, FiGrid, FiSearch } from "react-icons/fi";
import {
  LocationPicker,
  type LocationPickerLabels,
  type LocationValue,
  type RadiusKm,
  type SavedLocationOption,
} from "@/components/location/LocationPicker";
import type { BusinessDirectoryFilters, DirectoryFilterOption } from "@/lib/api";
import { CategoryIcon } from "@/lib/business-categories";

export type BusinessFilterLabels = {
  title: string;
  search: string;
  searchPlaceholder: string;
  categories: string;
  allCategories: string;
  subCategories: string;
  allSubCategories: string;
  showAll: string;
  showLess: string;
  city: string;
  allCities: string;
  location: string;
  reset: string;
  favoritesOnly: string;
  openNow: string;
  locationPicker: LocationPickerLabels;
};

type Props = {
  filters: BusinessDirectoryFilters;
  categories: DirectoryFilterOption[];
  subCategories: DirectoryFilterOption[];
  cities: DirectoryFilterOption[];
  labels: BusinessFilterLabels;
  locale: "de" | "en" | "fa";
  location: LocationValue | null;
  radiusKm: RadiusKm | null;
  onFiltersChange: (patch: Partial<BusinessDirectoryFilters>) => void;
  onLocationChange: (location: LocationValue | null) => void;
  onRadiusChange: (radius: RadiusKm | null) => void;
  onReset: () => void;
  showReset?: boolean;
  savedLocations?: SavedLocationOption[];
  variant?: "sidebar" | "popover" | "drawer";
};

export function BusinessFilters({
  filters,
  categories,
  subCategories,
  cities,
  labels,
  locale,
  location,
  radiusKm,
  onFiltersChange,
  onLocationChange,
  onRadiusChange,
  onReset,
  showReset = true,
  savedLocations = [],
  variant = "sidebar",
}: Props) {
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const visibleSubCategories = filters.categoryId
    ? subCategories.filter((item) => item.parentId === filters.categoryId)
    : [];
  const selectedCity = cities.find((city) => city.id === filters.cityId);
  const proximity = selectedCity?.latitude != null && selectedCity.longitude != null
    ? { latitude: selectedCity.latitude, longitude: selectedCity.longitude }
    : undefined;
  const categoryCount = optionCount(categories);
  const subCategoryCount = optionCount(visibleSubCategories);

  function reset() {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (searchInputRef.current) searchInputRef.current.value = "";
    onReset();
  }

  return (
    <aside className={variant === "sidebar" ? "lg:sticky lg:top-26 lg:self-start" : "w-full"}>
      <div className={`bg-white p-5 ${variant === "popover" ? "max-h-[min(72dvh,46rem)] overflow-y-auto overscroll-contain rounded-2xl" : variant === "drawer" ? "min-h-full" : "rounded-2xl border border-white shadow-[0_12px_36px_rgba(15,23,42,.06)]"}`}>
        <div className="space-y-6">
          <FilterGroup title={labels.search}>
            <div className="relative">
              <FiSearch className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
              <input
                ref={searchInputRef}
                id="business-search"
                defaultValue={filters.search}
                onChange={(event) => {
                  if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                  const search = event.target.value.trim() || undefined;
                  searchTimerRef.current = setTimeout(() => onFiltersChange({ search }), 350);
                }}
                placeholder={labels.searchPlaceholder}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 ps-10 pe-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </FilterGroup>

          <FilterGroup title={labels.categories}>
          <FilterChoiceList
            legend={labels.categories}
            allLabel={labels.allCategories}
            allCount={categoryCount}
            options={categories}
            selectedId={filters.categoryId}
            showAllLabel={labels.showAll}
            showLessLabel={labels.showLess}
            onSelect={(categoryId) => onFiltersChange({ categoryId, subCategoryId: undefined })}
          />
          </FilterGroup>

          {visibleSubCategories.length > 0 ? (
            <FilterGroup title={labels.subCategories}>
            <FilterChoiceList
              key={filters.categoryId}
              legend={labels.subCategories}
              allLabel={labels.allSubCategories}
              allCount={subCategoryCount}
              options={visibleSubCategories}
              selectedId={filters.subCategoryId}
              showAllLabel={labels.showAll}
              showLessLabel={labels.showLess}
              onSelect={(subCategoryId) => onFiltersChange({ subCategoryId })}
            />
            </FilterGroup>
          ) : null}

          <FilterGroup title={labels.location}>
            <LocationPicker
              value={location}
              radiusKm={radiusKm}
              language={locale}
              labels={labels.locationPicker}
              onChange={onLocationChange}
              onRadiusChange={onRadiusChange}
              savedLocations={savedLocations}
              proximity={proximity}
              compact
            />
          </FilterGroup>
        </div>

        {showReset ? (
          <button
            type="button"
            onClick={reset}
            className="mt-6 text-sm font-semibold text-slate-500 underline-offset-4 transition hover:text-primary hover:underline focus-visible:outline-none focus-visible:text-primary focus-visible:underline"
          >
            {labels.reset}
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-slate-200/70 pb-6">
      <h3 className="mb-3 text-[13px] font-semibold leading-5 text-slate-800">{title}</h3>
      {children}
    </section>
  );
}

const INITIAL_VISIBLE_OPTIONS = 5;

function optionCount(options: DirectoryFilterOption[]) {
  return options.some((option) => option.count !== undefined)
    ? options.reduce((total, option) => total + (option.count ?? 0), 0)
    : undefined;
}

function FilterChoiceList({
  legend,
  allLabel,
  allCount,
  options,
  selectedId,
  showAllLabel,
  showLessLabel,
  onSelect,
}: {
  legend: string;
  allLabel: string;
  allCount?: number;
  options: DirectoryFilterOption[];
  selectedId?: number;
  showAllLabel: string;
  showLessLabel: string;
  onSelect: (id: number | undefined) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const initialOptions = options.slice(0, INITIAL_VISIBLE_OPTIONS);
  const selectedOption = selectedId ? options.find((option) => option.id === selectedId) : undefined;
  const collapsedOptions = selectedOption && !initialOptions.some((option) => option.id === selectedOption.id)
    ? [...initialOptions, selectedOption]
    : initialOptions;
  const shownOptions = expanded ? options : collapsedOptions;
  const canExpand = options.length > INITIAL_VISIBLE_OPTIONS;

  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        <FilterChoiceButton
          label={allLabel}
          count={allCount}
          checked={!selectedId}
          iconKey={null}
          onClick={() => onSelect(undefined)}
        />
        {shownOptions.map((option) => (
          <FilterChoiceButton
            key={option.id}
            label={option.name}
            count={option.count}
            iconKey={option.iconKey}
            checked={selectedId === option.id}
            onClick={() => onSelect(option.id)}
          />
        ))}
      </div>
      {canExpand ? (
        <div className="pt-4">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            className="flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white !text-[13px] font-medium leading-5 text-slate-600 transition hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
          >
            {expanded ? showLessLabel : showAllLabel}
            <FiChevronDown aria-hidden="true" className={`text-xs transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      ) : null}
    </fieldset>
  );
}

function FilterChoiceButton({ label, count, iconKey, checked, onClick }: { label: string; count?: number; iconKey?: string | null; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onClick}
      className={`inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-start !text-[13px] leading-5 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 ${checked ? "border-primary/35 bg-primary/10 font-medium text-primary" : "border-slate-200 bg-white font-normal text-slate-600 hover:border-primary/40 hover:bg-primary/5 hover:text-slate-900"}`}
    >
      {iconKey ? <CategoryIcon iconKey={iconKey} className="shrink-0 text-sm text-primary" /> : <FiGrid aria-hidden="true" className="shrink-0 text-sm text-primary" />}
      <span className="min-w-0 truncate">{label}</span>
      {count !== undefined ? (
        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${checked ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"}`}>{count}</span>
      ) : null}
    </button>
  );
}
