"use client";

import { useEffect, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import { FiMapPin, FiNavigation } from "react-icons/fi";

type Props = {
  latitude: number;
  longitude: number;
  title: string;
  address?: string | null;
  directionsHref: string;
  labels: {
    title: string;
    loading: string;
    error: string;
    directions: string;
  };
};

export function BusinessLocationMap({ latitude, longitude, title, address, directionsHref, labels }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "fallback">("loading");
  const longitudeDelta = 0.012;
  const latitudeDelta = 0.006;
  const fallbackMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent([
    longitude - longitudeDelta,
    latitude - latitudeDelta,
    longitude + longitudeDelta,
    latitude + latitudeDelta,
  ].join(","))}&layer=mapnik&marker=${encodeURIComponent(`${latitude},${longitude}`)}`;

  useEffect(() => {
    let cancelled = false;
    let loaded = false;

    const showFallback = () => {
      if (cancelled || loaded) return;
      mapRef.current?.remove();
      mapRef.current = null;
      setState("fallback");
    };

    // WebGL, an invalid token or a blocked style request can otherwise leave the
    // canvas blank forever without emitting a useful error in every browser.
    const loadTimer = window.setTimeout(showFallback, 10_000);

    void Promise.all([
      import("mapbox-gl"),
      fetch("/api/geo/map-config", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("Map configuration is unavailable.");
        return response.json() as Promise<{ data: { accessToken: string; style: string } }>;
      }),
    ]).then(([module, config]) => {
      if (cancelled || !containerRef.current) return;
      const mapbox = module.default;
      if (!config.data?.accessToken || !config.data?.style) throw new Error("Invalid map configuration.");
      mapbox.accessToken = config.data.accessToken;
      const map = new mapbox.Map({
        container: containerRef.current,
        style: config.data.style,
        center: [longitude, latitude],
        zoom: 14.5,
        attributionControl: true,
        cooperativeGestures: true,
      });
      mapRef.current = map;
      map.scrollZoom.disable();
      map.addControl(new mapbox.NavigationControl({ showCompass: false }), "top-right");
      new mapbox.Marker({ color: "#f15b3f" })
        .setLngLat([longitude, latitude])
        .setPopup(new mapbox.Popup({ offset: 28 }).setText(address || title))
        .addTo(map);
      map.once("load", () => {
        if (!cancelled) {
          loaded = true;
          window.clearTimeout(loadTimer);
          window.requestAnimationFrame(() => map.resize());
          setState("ready");
        }
      });
    }).catch(() => {
      showFallback();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimer);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [address, latitude, longitude, title]);

  return (
    <section aria-labelledby="business-location-heading" className="overflow-hidden rounded-[30px] bg-white shadow-[0_20px_60px_rgba(15,23,42,.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <h2 id="business-location-heading" className="flex items-center gap-2 text-lg font-black text-slate-950 sm:text-xl">
          <FiMapPin className="text-primary" />
          {labels.title}
        </h2>
        <a href={directionsHref} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-white transition hover:bg-primary-dark">
          <FiNavigation />
          {labels.directions}
        </a>
      </div>
      <div className="relative h-[220px] bg-slate-100 sm:h-[280px]">
        <div ref={containerRef} className="h-full w-full" aria-label={`${labels.title}: ${title}`} />
        {state === "loading" ? <div className="absolute inset-0 grid place-items-center bg-slate-100 text-sm font-bold text-slate-500">{labels.loading}</div> : null}
        {state === "fallback" ? (
          <div className="absolute inset-0 bg-slate-100">
            <iframe
              src={fallbackMapUrl}
              title={`${labels.title}: ${title}`}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-full w-full border-0"
            />
            <span className="sr-only">{labels.error}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
