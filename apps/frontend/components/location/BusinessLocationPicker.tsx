"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FiCrosshair, FiLoader, FiMapPin, FiSearch } from "react-icons/fi";
import { MdMyLocation } from "react-icons/md";
import type mapboxgl from "mapbox-gl";
import { isAppLocale } from "@/i18n/config";

type Suggestion = {
  id: string;
  label: string;
  primaryText: string;
  secondaryText: string;
  latitude: number;
  longitude: number;
};

type Props = {
  defaultAddress?: string | null;
  defaultLatitude?: number | null;
  defaultLongitude?: number | null;
  /** Use light-mode portal styles instead of dark admin styles */
  portalMode?: boolean;
  /** Called whenever the resolved address text changes */
  onAddressChange?: (address: string) => void;
};

const DEFAULT_CENTER = { latitude: 52.52, longitude: 13.405 };
const REVERSE_IDLE_MS = 1000;

export function BusinessLocationPicker({ defaultAddress, defaultLatitude, defaultLongitude, portalMode = false, onAddressChange }: Props) {
  const rawLocale = useLocale();
  const locale = isAppLocale(rawLocale) ? rawLocale : "de";
  const t = useTranslations("Admin.location");
  const initialLatitude = defaultLatitude ?? DEFAULT_CENTER.latitude;
  const initialLongitude = defaultLongitude ?? DEFAULT_CENTER.longitude;
  const [address, setAddress] = useState(defaultAddress ?? "");
  const [latitude, setLatitude] = useState(initialLatitude);
  const [longitude, setLongitude] = useState(initialLongitude);
  const [query, setQuery] = useState(defaultAddress ?? "");
  const [coordinates, setCoordinates] = useState(`${initialLatitude}, ${initialLongitude}`);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "searching" | "locating" | "resolving">("loading");
  const [error, setError] = useState("");
  const visibleSuggestions = query.trim().length >= 2 ? suggestions : [];
  const onAddressChangeRef = useRef(onAddressChange);
  useEffect(() => { onAddressChangeRef.current = onAddressChange; }, [onAddressChange]);
  useEffect(() => { onAddressChangeRef.current?.(address); }, [address]);

  // Class tokens that differ between admin and portal modes
  const cls = portalMode
    ? {
        label: "grid gap-2 text-xs font-bold text-slate-600",
        input: "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition focus:border-primary",
        dropdown: "absolute inset-x-0 top-full z-20 mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl",
        suggestionBtn: "group block w-full rounded-xl border border-transparent px-3 py-2 text-start text-sm transition hover:border-primary/30 hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
        suggestionTitle: "block font-bold text-slate-900 transition group-hover:text-primary",
        suggestionSub: "text-xs text-slate-500",
        applyBtn: "inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:border-primary hover:text-primary",
        iconBtn: "absolute end-3 top-3 z-30 grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70",
        mapBorder: "border-slate-200",
      }
    : {
        label: "admin-muted grid gap-2 text-xs font-bold",
        input: "admin-input h-10 rounded-lg px-3 text-sm outline-none focus:border-sky-400",
        dropdown: "admin-section absolute inset-x-0 top-full z-20 mt-2 max-h-60 overflow-y-auto rounded-lg border p-2 shadow-xl",
        suggestionBtn: "group block w-full rounded-lg border border-transparent px-3 py-2 text-start text-sm transition hover:border-sky-400/40 hover:bg-sky-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400",
        suggestionTitle: "admin-title block transition group-hover:text-sky-300",
        suggestionSub: "admin-muted text-xs",
        applyBtn: "admin-button inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-black",
        iconBtn: "admin-icon-button absolute end-3 top-3 z-30 grid h-10 w-10 place-items-center rounded-lg border transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:cursor-wait disabled:opacity-70",
        mapBorder: "border-[var(--admin-border)]",
      };

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const reverseTimeoutRef = useRef<number | null>(null);
  const skipNextReverseRef = useRef(false);

  const reverseGeocode = useCallback(async (nextLatitude: number, nextLongitude: number) => {
    setStatus("resolving");
    try {
      const response = await fetch("/api/geo/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: nextLatitude, longitude: nextLongitude, language: locale }),
      });
      if (!response.ok) return;
      const json = (await response.json()) as { data?: { label?: string } };
      if (json.data?.label) {
        setAddress(json.data.label);
        setQuery(json.data.label);
      }
    } finally {
      setStatus("idle");
    }
  }, [locale]);

  const moveTo = useCallback((nextLatitude: number, nextLongitude: number, resolveAddress = true) => {
    setLatitude(nextLatitude);
    setLongitude(nextLongitude);
    setCoordinates(`${nextLatitude}, ${nextLongitude}`);
    skipNextReverseRef.current = resolveAddress;
    const map = mapRef.current;
    map?.easeTo({ center: [nextLongitude, nextLatitude], zoom: Math.max(map.getZoom(), 14), duration: 500 });
    if (resolveAddress) void reverseGeocode(nextLatitude, nextLongitude);
  }, [reverseGeocode]);

  function applyCoordinates() {
    const match = coordinates.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)$/);
    if (!match) {
      setError(t("invalidCoordinates"));
      return;
    }

    const nextLatitude = Number(match[1]);
    const nextLongitude = Number(match[2]);
    if (nextLatitude < -90 || nextLatitude > 90 || nextLongitude < -180 || nextLongitude > 180) {
      setError(t("invalidCoordinates"));
      return;
    }

    setError("");
    moveTo(nextLatitude, nextLongitude, true);
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      import("mapbox-gl"),
      fetch("/api/geo/map-config", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("map-config");
        return response.json() as Promise<{ data: { accessToken: string; style: string } }>;
      }),
    ]).then(([module, config]) => {
      if (cancelled || !containerRef.current) return;
      const mapbox = module.default;
      mapbox.accessToken = config.data.accessToken;
      const map = new mapbox.Map({
        container: containerRef.current,
        style: config.data.style,
        center: [initialLongitude, initialLatitude],
        zoom: defaultLatitude && defaultLongitude ? 14 : 6,
      });
      mapRef.current = map;
      map.addControl(new mapbox.NavigationControl({ showCompass: false }), "bottom-left");
      const normalizeMapControlButtons = () => {
        containerRef.current?.querySelectorAll("button").forEach((button) => {
          button.type = "button";
        });
      };
      normalizeMapControlButtons();
      const controlObserver = new MutationObserver(normalizeMapControlButtons);
      controlObserver.observe(containerRef.current, { childList: true, subtree: true });
      map.on("moveend", () => {
        const center = map.getCenter();
        setLatitude(center.lat);
        setLongitude(center.lng);
        setCoordinates(`${center.lat}, ${center.lng}`);
        if (skipNextReverseRef.current) {
          skipNextReverseRef.current = false;
          return;
        }
        if (reverseTimeoutRef.current) window.clearTimeout(reverseTimeoutRef.current);
        reverseTimeoutRef.current = window.setTimeout(() => {
          void reverseGeocode(center.lat, center.lng);
        }, REVERSE_IDLE_MS);
      });
      map.on("load", () => {
        map.resize();
        setStatus("idle");
      });
      const resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(containerRef.current);
      map.once("remove", () => {
        resizeObserver.disconnect();
        controlObserver.disconnect();
      });
    }).catch(() => {
      if (!cancelled) {
        setError(t("mapUnavailable"));
        setStatus("idle");
      }
    });

    return () => {
      cancelled = true;
      if (reverseTimeoutRef.current) window.clearTimeout(reverseTimeoutRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [defaultLatitude, defaultLongitude, initialLatitude, initialLongitude, reverseGeocode, t]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setStatus("searching");
      try {
        const response = await fetch("/api/geo/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: trimmed, language: locale, proximityLatitude: latitude, proximityLongitude: longitude }),
          signal: controller.signal,
        });
        if (!response.ok) return;
        const json = (await response.json()) as { data?: Suggestion[] };
        setSuggestions(json.data ?? []);
      } finally {
        setStatus("idle");
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [latitude, locale, longitude, query]);

  function useCurrentLocation() {
    if (!navigator.geolocation) return;
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        moveTo(position.coords.latitude, position.coords.longitude, true);
        setStatus("idle");
      },
      () => setStatus("idle"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="grid gap-3">
      <input type="hidden" name="latitude" value={latitude} />
      <input type="hidden" name="longitude" value={longitude} />
      <label className={cls.label}>
        {t("address")}
        <div className="relative">
          <input
            name="address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}
            className={`${cls.input} pe-8`}
          />
          {status === "resolving" ? (
            <FiLoader className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
          ) : null}
        </div>
      </label>

      <div className="relative">
        <FiSearch className="pointer-events-none absolute start-3 top-1/2 z-10 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} placeholder={t("searchPlaceholder")} className={`${cls.input} w-full px-10`} />
        {status === "searching" ? (
          <FiLoader className="pointer-events-none absolute end-3 top-1/2 z-10 -translate-y-1/2 animate-spin text-slate-400" />
        ) : null}
        {visibleSuggestions.length ? (
          <div className={cls.dropdown}>
            {visibleSuggestions.map((suggestion) => (
              <button key={suggestion.id} type="button" className={cls.suggestionBtn} onClick={() => {
                setAddress(suggestion.label);
                setQuery(suggestion.label);
                setSuggestions([]);
                moveTo(suggestion.latitude, suggestion.longitude, false);
              }}>
                <strong className={cls.suggestionTitle}>{suggestion.primaryText}</strong>
                <span className={cls.suggestionSub}>{suggestion.secondaryText}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <label className={cls.label}>
        {t("coordinates")}
        <span className="flex gap-2" dir="ltr">
          <input
            value={coordinates}
            onChange={(event) => setCoordinates(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyCoordinates();
              }
            }}
            inputMode="decimal"
            placeholder="52.4573881,13.3208078"
            className={`${cls.input} min-w-0 flex-1 text-left`}
          />
          <button type="button" onClick={applyCoordinates} className={cls.applyBtn}>
            <FiCrosshair /> {t("applyCoordinates")}
          </button>
        </span>
      </label>

      <div className={`relative overflow-hidden rounded-lg border ${cls.mapBorder}`}>
        <div ref={containerRef} className="h-[320px] w-full" />
        <div className={`address-center-pin ${status === "resolving" ? "address-center-pin--loading" : ""}`} aria-hidden="true"><span /></div>
        <div className="address-center-target" aria-hidden="true" />
        <button type="button" onClick={useCurrentLocation} disabled={status === "locating"} className={cls.iconBtn} aria-label={t("currentLocation")} aria-busy={status === "locating"}>
          {status === "locating" ? <FiLoader className="animate-spin" /> : <MdMyLocation />}
        </button>
        {status === "loading" ? <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/20 text-sm font-bold text-white">{t("loading")}</div> : null}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
        <span><FiMapPin className="inline" /> {latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
        {error ? <span className="text-rose-500">{error}</span> : null}
      </div>
    </div>
  );
}
