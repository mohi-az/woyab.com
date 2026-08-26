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
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      import("mapbox-gl"),
      fetch("/api/geo/map-config", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("Map configuration is unavailable.");
        return response.json() as Promise<{ data: { accessToken: string; style: string } }>;
      }),
    ]).then(([module, config]) => {
      if (cancelled || !containerRef.current) return;
      const mapbox = module.default;
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
        if (!cancelled) setState("ready");
      });
      map.once("error", () => {
        if (!cancelled) setState("error");
      });
    }).catch(() => {
      if (!cancelled) setState("error");
    });

    return () => {
      cancelled = true;
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
        <div ref={containerRef} className="absolute inset-0" aria-label={`${labels.title}: ${title}`} />
        {state === "loading" ? <div className="absolute inset-0 grid place-items-center bg-slate-100 text-sm font-bold text-slate-500">{labels.loading}</div> : null}
        {state === "error" ? (
          <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,#fff7f4,#f1f5f9)] p-6 text-center">
            <div>
              <FiMapPin className="mx-auto text-3xl text-primary" />
              <p className="mt-3 text-sm font-bold text-slate-600">{labels.error}</p>
              {address ? <p dir="auto" className="mt-2 text-sm text-slate-500">{address}</p> : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
