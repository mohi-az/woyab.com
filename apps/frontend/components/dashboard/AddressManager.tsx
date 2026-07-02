"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FiBriefcase, FiCheck, FiEdit3, FiHeart, FiHome, FiLoader, FiMapPin, FiSearch, FiStar, FiTrash2, FiX } from "react-icons/fi";
import { MdMyLocation } from "react-icons/md";
import type mapboxgl from "mapbox-gl";

type Address = {
  id: string;
  label: string;
  icon: "HOME" | "WORK" | "FAVORITE" | "OTHER";
  address: string;
  cityName: string;
  districtName: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
};

type Suggestion = {
  id: string;
  label: string;
  primaryText: string;
  secondaryText: string;
  latitude: number;
  longitude: number;
  city?: string | null;
  district?: string | null;
};

type DraftAddress = Omit<Address, "id">;

const DEFAULT_CENTER = { latitude: 52.52, longitude: 13.405 };
const MAP_REVERSE_IDLE_MS = 3_000;

const empty: DraftAddress = {
  label: "",
  icon: "HOME",
  address: "",
  cityName: "",
  districtName: "",
  latitude: DEFAULT_CENTER.latitude,
  longitude: DEFAULT_CENTER.longitude,
  isDefault: false,
};

function iconFor(icon: Address["icon"]) {
  if (icon === "HOME") return <FiHome />;
  if (icon === "WORK") return <FiBriefcase />;
  if (icon === "FAVORITE") return <FiHeart />;
  return <FiMapPin />;
}

function mapIconMarkup(icon: Address["icon"]) {
  if (icon === "HOME") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>';
  }
  if (icon === "WORK") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1"/><path d="M3 8h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 13h18"/></svg>';
  }
  if (icon === "FAVORITE") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
}

function normalizeAddress(item: Address): Address {
  return {
    ...item,
    cityName: item.cityName ?? "",
    districtName: item.districtName ?? "",
  };
}

export function AddressManager({ initial }: { initial: Address[] }) {
  const locale = useLocale();
  const t = useTranslations("Dashboard.addresses.manager");
  const [items, setItems] = useState(() => initial.map(normalizeAddress));
  const [editing, setEditing] = useState<Address | null>(null);
  const [draft, setDraft] = useState<DraftAddress>(empty);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "searching" | "locating" | "saving" | "resolving">("idle");
  const [addressSyncPending, setAddressSyncPending] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapboxRef = useRef<typeof mapboxgl | null>(null);
  const savedMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reverseTimeoutRef = useRef<number | null>(null);
  const skipNextMoveReverseRef = useRef(false);

  const reverseGeocode = useCallback(async (latitude: number, longitude: number) => {
    setStatus("resolving");
    try {
      const response = await fetch("/api/geo/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude, language: locale }),
      });
      if (!response.ok) return;
      const json = (await response.json()) as {
        data?: { label?: string; city?: string | null; district?: string | null };
      };
      setDraft((current) => ({
        ...current,
        address: json.data?.label || current.address,
        cityName: json.data?.city || current.cityName,
        districtName: json.data?.district || current.districtName,
      }));
      if (json.data?.label) setQuery(json.data.label);
    } finally {
      setStatus("idle");
    }
  }, [locale]);

  const setPickedLocation = useCallback((latitude: number, longitude: number, resolveAddress = false) => {
    setDraft((current) => ({ ...current, latitude, longitude }));
    const map = mapRef.current;
    if (map) skipNextMoveReverseRef.current = resolveAddress;
    map?.easeTo({ center: [longitude, latitude], zoom: Math.max(map.getZoom(), 14), duration: 500 });
    if (resolveAddress) void reverseGeocode(latitude, longitude);
  }, [reverseGeocode]);

  useEffect(() => {
    let cancelled = false;
    const savedMarkers = savedMarkersRef.current;

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
      mapboxRef.current = mapbox;
      const map = new mapbox.Map({
        container: containerRef.current,
        style: config.data.style,
        center: [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude],
        zoom: 12,
      });

      map.on("movestart", () => {
        if (reverseTimeoutRef.current) {
          window.clearTimeout(reverseTimeoutRef.current);
          reverseTimeoutRef.current = null;
        }
        setAddressSyncPending(false);
      });

      map.on("moveend", () => {
        const center = map.getCenter();
        setDraft((current) => ({ ...current, latitude: center.lat, longitude: center.lng }));
        if (skipNextMoveReverseRef.current) {
          skipNextMoveReverseRef.current = false;
          return;
        }
        if (reverseTimeoutRef.current) window.clearTimeout(reverseTimeoutRef.current);
        setAddressSyncPending(true);
        reverseTimeoutRef.current = window.setTimeout(() => {
          setAddressSyncPending(false);
          void reverseGeocode(center.lat, center.lng);
        }, MAP_REVERSE_IDLE_MS);
      });
      map.addControl(new mapbox.NavigationControl({ showCompass: false }), "bottom-left");

      mapRef.current = map;
      const resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(containerRef.current);
      map.on("load", () => {
        map.resize();
        window.setTimeout(() => map.resize(), 100);
        setMapReady(true);
      });
      map.once("remove", () => resizeObserver.disconnect());
    }).catch(() => {
      if (!cancelled) setError(t("errors.mapUnavailable"));
    });

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      if (reverseTimeoutRef.current) window.clearTimeout(reverseTimeoutRef.current);
      setAddressSyncPending(false);
      popupRef.current?.remove();
      savedMarkers.forEach((savedMarker) => savedMarker.remove());
      savedMarkers.clear();
      mapRef.current?.remove();
      mapboxRef.current = null;
      popupRef.current = null;
      reverseTimeoutRef.current = null;
      skipNextMoveReverseRef.current = false;
      mapRef.current = null;
    };
  }, [reverseGeocode, setPickedLocation, t]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !mapboxRef.current) return;

    const map = mapRef.current;
    const mapbox = mapboxRef.current;
    const activeIds = new Set(items.map((item) => item.id));

    savedMarkersRef.current.forEach((savedMarker, id) => {
      if (!activeIds.has(id)) {
        savedMarker.remove();
        savedMarkersRef.current.delete(id);
      }
    });

    items.forEach((item) => {
      savedMarkersRef.current.get(item.id)?.remove();

      const markerElement = document.createElement("button");
      markerElement.type = "button";
      markerElement.className = `address-saved-marker${item.isDefault ? " address-saved-marker--default" : ""}`;
      markerElement.setAttribute("aria-label", item.label);
      markerElement.innerHTML = mapIconMarkup(item.icon);
      markerElement.addEventListener("click", (event) => {
        event.stopPropagation();
        popupRef.current?.remove();

        const content = document.createElement("article");
        content.className = "address-map-popup";
        const title = document.createElement("strong");
        title.textContent = item.label;
        content.append(title);

        popupRef.current = new mapbox.Popup({ offset: 18, maxWidth: "280px" })
          .setLngLat([item.longitude, item.latitude])
          .setDOMContent(content)
          .addTo(map);
      });

      const savedMarker = new mapbox.Marker({ element: markerElement, anchor: "center" })
        .setLngLat([item.longitude, item.latitude])
        .addTo(map);
      savedMarkersRef.current.set(item.id, savedMarker);
    });

    if (items.length > 0 && !editing) {
      const bounds = new mapbox.LngLatBounds();
      items.forEach((item) => bounds.extend([item.longitude, item.latitude]));
      skipNextMoveReverseRef.current = true;
      map.fitBounds(bounds, { padding: 90, maxZoom: 14, duration: 650 });
    }
  }, [editing, items, mapReady]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      abortRef.current?.abort();
      return;
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("searching");
      setError("");

      try {
        const response = await fetch("/api/geo/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: trimmed,
            language: locale,
            proximityLatitude: draft.latitude,
            proximityLongitude: draft.longitude,
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("suggestions");
        const json = (await response.json()) as { data?: Suggestion[] };
        setSuggestions(json.data ?? []);
      } catch (requestError) {
        if ((requestError as Error).name !== "AbortError") setError(t("errors.searchUnavailable"));
      } finally {
        if (!controller.signal.aborted) setStatus("idle");
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [draft.latitude, draft.longitude, locale, query, t]);

  function selectSuggestion(suggestion: Suggestion) {
    setDraft((current) => ({
      ...current,
      address: suggestion.label,
      cityName: suggestion.city ?? "",
      districtName: suggestion.district ?? "",
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    }));
    setQuery(suggestion.label);
    setSuggestions([]);
    setPickedLocation(suggestion.latitude, suggestion.longitude);
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setError(t("errors.geolocationUnsupported"));
      return;
    }

    setStatus("locating");
    setAddressSyncPending(false);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPickedLocation(position.coords.latitude, position.coords.longitude, true);
      },
      (locationError) => {
        setStatus("idle");
        setError(locationError.code === locationError.PERMISSION_DENIED
          ? t("errors.permissionDenied")
          : t("errors.locationUnavailable"));
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!draft.address.trim()) {
      setError(t("errors.pickFirst"));
      return;
    }

    setStatus("saving");
    const body = {
      ...draft,
      label: draft.label.trim(),
      address: draft.address.trim(),
      cityName: draft.cityName.trim(),
      districtName: draft.districtName.trim(),
    };

    const response = await fetch(editing ? `/api/account/addresses/${editing.id}` : "/api/account/addresses", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    setStatus("idle");

    if (!response.ok) {
      setError(result.error ?? t("errors.saveFailed"));
      return;
    }

    const saved = normalizeAddress(result.data);
    setItems((current) => editing
      ? current.map((item) => item.id === editing.id ? saved : (body.isDefault ? { ...item, isDefault: false } : item))
      : [...current.map((item) => body.isDefault ? { ...item, isDefault: false } : item), saved]);
    setEditing(null);
    setDraft({ ...empty, isDefault: items.length === 0 });
    setQuery("");
    setSuggestions([]);
    setMessage(t("messages.saved"));
  }

  async function remove(id: string) {
    setError("");
    const response = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    if (response.ok) {
      setItems((current) => current.filter((item) => item.id !== id));
      if (editing?.id === id) cancelEditing();
      return;
    }
    setError(t("errors.deleteFailed"));
  }

  function startEditing(item: Address) {
    setEditing(item);
    setDraft({
      label: item.label,
      icon: item.icon,
      address: item.address,
      cityName: item.cityName,
      districtName: item.districtName,
      latitude: item.latitude,
      longitude: item.longitude,
      isDefault: item.isDefault,
    });
    setQuery(item.address);
    setSuggestions([]);
    setMessage("");
    setError("");
    setPickedLocation(item.latitude, item.longitude);
  }

  function cancelEditing() {
    setEditing(null);
    setDraft({ ...empty, isDefault: items.length === 0 });
    setQuery("");
    setSuggestions([]);
    setMessage("");
    setError("");
  }

  const isBusy = status !== "idle";
  const addressFieldsLoading = addressSyncPending || status === "resolving";

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="relative min-h-[380px] overflow-hidden bg-slate-100 xl:min-h-[520px]">
            <div ref={containerRef} className="absolute inset-0 h-full w-full" aria-label={t("map.label")} />
            {!mapReady ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/45 backdrop-blur-[1px]">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-lg">
                  <FiLoader className="animate-spin text-primary" />
                  {t("map.loading")}
                </span>
              </div>
            ) : null}
            <div className="absolute inset-x-4 top-4 z-10 mx-auto max-w-2xl">
              <div className="relative">
                <FiSearch className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => {
                    const nextQuery = event.target.value;
                    setQuery(nextQuery);
                    if (nextQuery.trim().length < 3) setSuggestions([]);
                  }}
                  placeholder={t("map.searchPlaceholder")}
                  className="h-13 w-full rounded-2xl border border-white/80 bg-white/95 px-12 pe-28 text-sm font-bold text-slate-800 shadow-xl outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={status === "locating"}
                  className="absolute left-2 top-1/2 inline-flex h-9 -translate-y-1/2 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-black text-white transition hover:bg-primary-dark disabled:cursor-wait disabled:opacity-70"
                >
                  {status === "locating" ? <FiLoader className="animate-spin" /> : <MdMyLocation />}
                  {t("map.currentLocation")}
                </button>
              </div>

              {suggestions.length > 0 ? (
                <div className="mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => selectSuggestion(suggestion)}
                      className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-start transition hover:bg-slate-50"
                    >
                      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <FiMapPin />
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate text-sm text-slate-900">{suggestion.primaryText}</strong>
                        <span className="mt-1 block truncate text-xs text-slate-500">{suggestion.secondaryText}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className={`address-center-pin ${status === "resolving" ? "address-center-pin--loading" : ""}`} aria-hidden="true">
              <span />
            </div>
            <div className="address-center-target" aria-hidden="true" />

          </div>

          <form onSubmit={submit} className="flex flex-col gap-5 border-t border-slate-200 p-5 xl:border-r xl:border-t-0">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-primary">{editing ? t("form.editEyebrow") : t("form.newEyebrow")}</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">{t("form.title")}</h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(["HOME", "WORK", "FAVORITE", "OTHER"] as const).map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, icon }))}
                  aria-pressed={draft.icon === icon}
                  className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-black transition ${
                    draft.icon === icon ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-600 hover:border-primary/40"
                  }`}
                >
                  {iconFor(icon)}
                  {t(`icons.${icon}`)}
                </button>
              ))}
            </div>

            <label className="block text-sm font-bold text-slate-800">
              {t("form.label")}
              <input
                required
                value={draft.label}
                onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>

            <div className={`relative space-y-3 rounded-2xl transition ${addressFieldsLoading ? "pointer-events-none opacity-55 blur-[1px]" : ""}`}>
              <label className="block text-sm font-bold text-slate-800">
                {t("form.address")}
                <textarea
                  required
                  value={draft.address}
                  onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))}
                  rows={2}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal leading-6 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  placeholder={t("form.addressPlaceholder")}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <TextInput label={t("form.city")} value={draft.cityName} onChange={(value) => setDraft((current) => ({ ...current, cityName: value }))} />
                <TextInput label={t("form.district")} value={draft.districtName} onChange={(value) => setDraft((current) => ({ ...current, districtName: value }))} />
              </div>
            </div>
            {addressFieldsLoading ? (
              <div className="pointer-events-none -mt-2 flex justify-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-lg ring-1 ring-slate-200">
                  <FiLoader className="animate-spin text-primary" />
                  {t("form.syncing")}
                </span>
              </div>
            ) : null}

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={draft.isDefault}
                onChange={(event) => setDraft((current) => ({ ...current, isDefault: event.target.checked }))}
                className="h-4 w-4 accent-primary"
              />
              {t("form.default")}
            </label>

            {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{error}</p> : null}
            {message ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p> : null}

            <div className="mt-auto flex gap-2">
              <button disabled={isBusy} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-white transition hover:bg-primary-dark disabled:cursor-wait disabled:opacity-70">
                {status === "saving" ? <FiLoader className="animate-spin" /> : <FiCheck />}
                {t("form.save")}
              </button>
              {editing ? (
                <button type="button" onClick={cancelEditing} className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50" aria-label={t("form.cancel")}>
                  <FiX />
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">{t("saved.title")}</h2>
            <p className="mt-1 text-sm text-slate-500">{t("saved.description")}</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">{t("saved.count", { count: items.length })}</span>
        </div>

        {items.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg text-primary">
                      {iconFor(item.icon)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="flex flex-wrap items-center gap-2 font-black text-slate-950">
                        {item.label}
                        {item.isDefault ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] text-amber-700"><FiStar />{t("saved.defaultBadge")}</span> : null}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{item.address}</p>
                      <p className="mt-2 text-xs text-slate-400">{[item.cityName, item.districtName].filter(Boolean).join("، ") || t("saved.noArea")}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => startEditing(item)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-primary/10 hover:text-primary" aria-label={t("saved.edit")}>
                      <FiEdit3 />
                    </button>
                    <button type="button" onClick={() => remove(item.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600" aria-label={t("saved.delete")}>
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <FiMapPin className="mx-auto text-3xl text-primary" />
            <h3 className="mt-4 text-lg font-black text-slate-950">{t("empty.title")}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{t("empty.description")}</p>
          </div>
        )}
      </section>
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-bold text-slate-800">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
      />
    </label>
  );
}
