"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FiBriefcase, FiHeart, FiHome, FiLoader, FiMapPin, FiX } from "react-icons/fi";
import { MdMyLocation } from "react-icons/md";

export type RadiusKm = 1 | 3 | 5 | 10 | 25 | 50;

export type LocationValue = {
  source: "CURRENT" | "MANUAL" | "SAVED";
  label: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  city?: string | null;
  district?: string | null;
  providerId?: string | null;
};

export type SavedLocationOption = LocationValue & {
  id: string;
  icon: "HOME" | "WORK" | "FAVORITE" | "OTHER";
};

type Suggestion = {
  id: string;
  label: string;
  primaryText: string;
  secondaryText: string;
  type: string;
  latitude: number;
  longitude: number;
  city?: string | null;
  district?: string | null;
  providerId?: string | null;
};

export type LocationPickerLabels = {
  inputLabel: string;
  placeholder: string;
  useCurrentLocation: string;
  locating: string;
  currentLocation: string;
  savedLocations: string;
  radius: string;
  anyDistance: string;
  radiusHint: string;
  clear: string;
  unavailable: string;
  permissionDenied: string;
  timeout: string;
  noResults: string;
};

type Props = {
  value: LocationValue | null;
  radiusKm: RadiusKm | null;
  language: "de" | "en" | "fa";
  labels: LocationPickerLabels;
  onChange: (value: LocationValue | null) => void;
  onRadiusChange: (radius: RadiusKm | null) => void;
  savedLocations?: SavedLocationOption[];
  proximity?: { latitude: number; longitude: number };
  storageKey?: string;
  compact?: boolean;
};

const RADIUS_OPTIONS: RadiusKm[] = [1, 3, 5, 10, 25, 50];

function savedIcon(icon: SavedLocationOption["icon"]) {
  if (icon === "HOME") return <FiHome />;
  if (icon === "WORK") return <FiBriefcase />;
  if (icon === "FAVORITE") return <FiHeart />;
  return <FiMapPin />;
}

export function LocationPicker({
  value,
  radiusKm,
  language,
  labels,
  onChange,
  onRadiusChange,
  savedLocations = [],
  proximity,
  storageKey = "woyab:business-search-location",
  compact = false,
}: Props) {
  const listboxId = useId();
  const [query, setQuery] = useState(value?.label ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [status, setStatus] = useState<"idle" | "searching" | "locating">("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const operationRef = useRef(0);
  const skipFirstPersistRef = useRef(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { value?: LocationValue; radiusKm?: RadiusKm | null };
      if (
        parsed.value &&
        Number.isFinite(parsed.value.latitude) &&
        Number.isFinite(parsed.value.longitude)
      ) {
        skipFirstPersistRef.current = true;
        const operation = operationRef.current;
        const restoreTimer = window.setTimeout(() => {
          if (operation !== operationRef.current) return;
          setQuery(parsed.value!.label);
          onChange(parsed.value!);
          if (parsed.radiusKm === null || RADIUS_OPTIONS.includes(parsed.radiusKm ?? 5)) {
            onRadiusChange(parsed.radiusKm === null ? null : parsed.radiusKm ?? 5);
          }
        }, 0);
        return () => window.clearTimeout(restoreTimer);
      }
    } catch {
      sessionStorage.removeItem(storageKey);
    }
  }, [onChange, onRadiusChange, storageKey]);

  useEffect(() => {
    if (skipFirstPersistRef.current) {
      skipFirstPersistRef.current = false;
      return;
    }
    if (!value) {
      sessionStorage.removeItem(storageKey);
      return;
    }
    sessionStorage.setItem(storageKey, JSON.stringify({ value, radiusKm }));
  }, [radiusKm, storageKey, value]);

  useEffect(() => {
    if (value?.label && query === value.label) return;
    if (query.trim().length < 3) {
      abortRef.current?.abort();
      return;
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("searching");
      setError(null);
      try {
        const response = await fetch("/api/geo/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: query.trim(),
            language,
            proximityLatitude: proximity?.latitude,
            proximityLongitude: proximity?.longitude,
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("provider");
        const json = (await response.json()) as { data?: Suggestion[] };
        setSuggestions(json.data ?? []);
        setActiveIndex(-1);
        setOpen(true);
      } catch (requestError) {
        if ((requestError as Error).name !== "AbortError") {
          setSuggestions([]);
          setError(labels.unavailable);
        }
      } finally {
        if (!controller.signal.aborted) setStatus("idle");
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [labels.unavailable, language, proximity?.latitude, proximity?.longitude, query, value?.label]);

  function selectSuggestion(suggestion: Suggestion) {
    operationRef.current += 1;
    setError(null);
    const selected: LocationValue = {
      source: "MANUAL",
      label: suggestion.label,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      city: suggestion.city,
      district: suggestion.district,
      providerId: suggestion.providerId,
    };
    setQuery(selected.label);
    setOpen(false);
    setSuggestions([]);
    setStatus("idle");
    onChange(selected);
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setError(labels.unavailable);
      return;
    }
    setStatus("locating");
    const operation = ++operationRef.current;
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (operation !== operationRef.current) return;
        const current: LocationValue = {
          source: "CURRENT",
          label: labels.currentLocation,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setQuery(current.label);
        setOpen(false);
        onChange(current);
        setStatus("idle");

        try {
          const response = await fetch("/api/geo/reverse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: current.latitude,
              longitude: current.longitude,
              language,
            }),
          });
          if (!response.ok) return;
          const json = (await response.json()) as { data: Omit<LocationValue, "source"> };
          if (operation !== operationRef.current) return;
          const resolved = { ...current, ...json.data, source: "CURRENT" as const };
          setQuery(resolved.label);
          onChange(resolved);
        } catch {
          // Coordinates remain usable when reverse geocoding is unavailable.
        }
      },
      (locationError) => {
        if (operation !== operationRef.current) return;
        setStatus("idle");
        setOpen(true);
        setError(locationError.code === locationError.PERMISSION_DENIED
          ? labels.permissionDenied
          : locationError.code === locationError.TIMEOUT
            ? labels.timeout
            : labels.unavailable);
      },
      // A cached fix can belong to a previous network/location (for example,
      // Cologne after the user has moved to Berlin). Always request a fresh
      // reading when the user explicitly clicks the current-location button.
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  function chooseSaved(saved: SavedLocationOption) {
    operationRef.current += 1;
    const location: LocationValue = {
      source: "SAVED",
      label: saved.label,
      latitude: saved.latitude,
      longitude: saved.longitude,
      accuracy: saved.accuracy,
      city: saved.city,
      district: saved.district,
      providerId: saved.providerId,
    };
    setQuery(saved.label);
    setOpen(false);
    onChange(location);
  }

  function clearLocation() {
    operationRef.current += 1;
    abortRef.current?.abort();
    setQuery("");
    setSuggestions([]);
    setError(null);
    setOpen(false);
    sessionStorage.removeItem(storageKey);
    onChange(null);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showSaved = open && query.length === 0 && savedLocations.length > 0;

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="relative">
        <label htmlFor={`${listboxId}-input`} className={compact ? "mb-1.5 block text-[13px] font-medium leading-5 text-slate-700" : "mb-2 block text-sm font-bold text-gray-800"}>
          {labels.inputLabel}
        </label>
        <div className="relative flex items-center">
          <FiMapPin className="pointer-events-none absolute left-4 text-primary rtl:left-auto rtl:right-4" />
          <input
            id={`${listboxId}-input`}
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={open}
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
            value={query}
            onChange={(event) => {
              operationRef.current += 1;
              const nextQuery = event.target.value;
              if (value) onChange(null);
              setQuery(nextQuery);
              setStatus("idle");
              if (nextQuery.trim().length < 3) {
                abortRef.current?.abort();
                setSuggestions([]);
                setStatus("idle");
              }
              setOpen(true);
              setError(null);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={labels.placeholder}
            className={`${compact ? "h-11 text-[14px]" : "h-12 text-sm"} w-full rounded-xl border border-gray-200 bg-white px-11 pe-20 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10`}
          />
          <div className="absolute right-2 flex items-center gap-1 rtl:left-2 rtl:right-auto">
            {value ? (
              <button type="button" onClick={clearLocation} aria-label={labels.clear} className="btn btn-ghost btn-square btn-xs cursor-pointer rounded-lg text-gray-400">
                <FiX />
              </button>
            ) : null}
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={status === "locating"}
              aria-label={labels.useCurrentLocation}
              title={labels.useCurrentLocation}
              className="btn btn-primary btn-square btn-sm cursor-pointer rounded-lg disabled:cursor-not-allowed"
            >
              {status === "locating" ? <FiLoader className="animate-spin" /> : <MdMyLocation />}
            </button>
          </div>
        </div>

        {open && (showSaved || (query.trim().length >= 3 && query !== value?.label)) ? (
          <div id={listboxId} role="listbox" className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
            {showSaved ? (
              <div>
                <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-400">{labels.savedLocations}</p>
                {savedLocations.map((saved) => (
                  <button key={saved.id} type="button" onClick={() => chooseSaved(saved)} className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm hover:bg-primary/5">
                    <span className="text-primary">{savedIcon(saved.icon)}</span>
                    <span className="min-w-0"><strong className="block truncate text-gray-800">{saved.label}</strong></span>
                  </button>
                ))}
              </div>
            ) : null}
            {status === "searching" ? (
              <div className="flex items-center justify-center gap-2 p-4 text-sm text-gray-500"><FiLoader className="animate-spin" />{labels.locating}</div>
            ) : suggestions.length > 0 ? suggestions.map((suggestion, index) => (
              <button
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={activeIndex === index}
                key={suggestion.id}
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectSuggestion(suggestion)}
                className={`flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-start transition ${activeIndex === index ? "bg-primary/10" : "hover:bg-gray-50"}`}
              >
                <FiMapPin className="mt-0.5 shrink-0 text-primary" />
                <span className="min-w-0">
                  <strong className="block truncate text-sm text-gray-900">{suggestion.primaryText}</strong>
                  <span className="block truncate text-xs text-gray-500">{suggestion.secondaryText}</span>
                </span>
              </button>
            )) : <p className="p-4 text-center text-sm text-gray-500">{labels.noResults}</p>}
          </div>
        ) : null}
      </div>

      {error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">{error}</p> : null}

      <div>
        <label htmlFor={`${listboxId}-radius`} className={compact ? "mb-1.5 block text-[13px] font-medium leading-5 text-slate-700" : "mb-2 block text-sm font-bold text-gray-800"}>{labels.radius}</label>
        <select
          id={`${listboxId}-radius`}
          value={radiusKm ?? ""}
          disabled={!value}
          onChange={(event) => onRadiusChange(event.target.value ? Number(event.target.value) as RadiusKm : null)}
          className={`${compact ? "h-11 text-[14px]" : "h-12 text-sm"} w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 outline-none transition disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 focus:border-primary focus:ring-4 focus:ring-primary/10`}
        >
          <option value="">{labels.anyDistance}</option>
          {RADIUS_OPTIONS.map((radius) => <option key={radius} value={radius}>{radius} km</option>)}
        </select>
        {!value ? <p className={`${compact ? "mt-1.5 text-[12px] leading-4" : "mt-2 text-xs leading-5"} text-gray-500`}>{labels.radiusHint}</p> : null}
      </div>
    </div>
  );
}
