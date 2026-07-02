"use client";

import { useRef, useState } from "react";
import { FiChevronDown, FiSearch, FiX } from "react-icons/fi";
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
  city: string;
  allCities: string;
  location: string;
  reset: string;
  favoritesOnly: string;
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
  resetVersion: number;
  savedLocations?: SavedLocationOption[];
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
  resetVersion,
  savedLocations = [],
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

  function reset() {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (searchInputRef.current) searchInputRef.current.value = "";
    onReset();
  }

  return (
    <aside className="lg:sticky lg:top-26 lg:self-start">
      <div className="space-y-4 rounded-2xl border border-white bg-white p-4 shadow-[0_12px_36px_rgba(15,23,42,.06)]">
        <FilterSection title={labels.categories} defaultOpen>
          <fieldset>
            <legend className="sr-only">{labels.categories}</legend>
            <div className="max-h-80 space-y-1 overflow-y-auto overflow-x-hidden pe-4 [scrollbar-gutter:stable]">
              <FilterRadio
                name="categoryId"
                label={labels.allCategories}
                checked={!filters.categoryId}
                onChange={() => onFiltersChange({ categoryId: undefined, subCategoryId: undefined })}
              />
              {categories.map((category) => (
                <FilterRadio
                  key={category.id}
                  name="categoryId"
                  value={category.id}
                  label={category.name}
                  iconKey={category.iconKey}
                  count={category.count}
                  checked={filters.categoryId === category.id}
                  onChange={() => onFiltersChange({ categoryId: category.id, subCategoryId: undefined })}
                />
              ))}
            </div>
          </fieldset>
        </FilterSection>

        {visibleSubCategories.length > 0 ? (
          <FilterSection title={labels.subCategories} defaultOpen>
            <fieldset>
              <legend className="sr-only">{labels.subCategories}</legend>
              <div className="max-h-64 space-y-1 overflow-y-auto overflow-x-hidden pe-4 [scrollbar-gutter:stable]">
                <FilterRadio
                  name="subCategoryId"
                  label={labels.allSubCategories}
                  checked={!filters.subCategoryId}
                  onChange={() => onFiltersChange({ subCategoryId: undefined })}
                />
                {visibleSubCategories.map((subCategory) => (
                  <FilterRadio
                    key={subCategory.id}
                    name="subCategoryId"
                    value={subCategory.id}
                    label={subCategory.name}
                    iconKey={subCategory.iconKey}
                    count={subCategory.count}
                    checked={filters.subCategoryId === subCategory.id}
                    onChange={() => onFiltersChange({ subCategoryId: subCategory.id })}
                  />
                ))}
              </div>
            </fieldset>
          </FilterSection>
        ) : null}

        <FilterSection title={labels.location} defaultOpen>
          <LocationPicker
            key={resetVersion}
            value={location}
            radiusKm={radiusKm}
            language={locale}
            labels={labels.locationPicker}
            onChange={onLocationChange}
            onRadiusChange={onRadiusChange}
            savedLocations={savedLocations}
            proximity={proximity}
          />
        </FilterSection>

        <FilterSection title={labels.title} defaultOpen>
          <div className="space-y-5">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-primary/15 bg-white p-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(filters.favoritesOnly)}
                onChange={(event) => onFiltersChange({ favoritesOnly: event.target.checked || undefined })}
                className="h-4 w-4 accent-primary"
              />
              {labels.favoritesOnly}
            </label>
            <div>
              <label htmlFor="business-search" className="mb-2 block text-sm font-bold text-gray-800">{labels.search}</label>
              <div className="relative">
                <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-4" />
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
                  className="h-12 w-full rounded-xl border border-gray-200 bg-white px-11 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>

            <div>
              <label htmlFor="business-city" className="mb-2 block text-sm font-bold text-gray-800">{labels.city}</label>
              <select
                id="business-city"
                value={filters.cityId ?? ""}
                onChange={(event) => onFiltersChange({ cityId: event.target.value ? Number(event.target.value) : undefined })}
                className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                <option value="">{labels.allCities}</option>
                {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
              </select>
            </div>
          </div>
        </FilterSection>

        <button type="button" onClick={reset} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:border-primary hover:bg-primary/5 hover:text-primary">
          <FiX /> {labels.reset}
        </button>
      </div>
    </aside>
  );
}

function FilterSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <details open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)} className="group overflow-hidden rounded-xl bg-[#f8f5f1]">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 text-base font-extrabold text-slate-950 marker:content-none sm:text-lg">
        {title}
        <FiChevronDown className="shrink-0 text-base transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-5">{children}</div>
    </details>
  );
}

function FilterRadio({ name, value, label, count, iconKey, checked, onChange }: { name: string; value?: number; label: string; count?: number; iconKey?: string | null; checked: boolean; onChange: () => void }) {
  return (
    <label className="grid min-h-10 w-full min-w-0 cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 text-sm text-slate-600 transition hover:bg-white hover:text-slate-950">
      <input type="radio" name={name} value={value ?? ""} checked={checked} onChange={onChange} className="radio radio-xs border-gray-300 text-primary [--chkbg:var(--color-primary)]" />
      {iconKey ? <CategoryIcon iconKey={iconKey} className="shrink-0 text-base text-primary" /> : <span aria-hidden="true" />}
      <span className="min-w-0 truncate">{label}</span>
      {count !== undefined ? <span className="justify-self-end whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-400">{count}</span> : null}
    </label>
  );
}
