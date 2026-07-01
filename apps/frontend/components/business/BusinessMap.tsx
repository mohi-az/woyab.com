"use client";

import { useEffect, useRef, useState } from "react";
import { FiLoader, FiMapPin } from "react-icons/fi";
import type { Feature, FeatureCollection, Point } from "geojson";
import type mapboxgl from "mapbox-gl";
import type { LocationValue, RadiusKm } from "@/components/location/LocationPicker";
import type { BusinessDirectoryFilters } from "@/lib/api";

type MapProperties = {
  locationId: string;
  locationType: "PRIMARY" | "BRANCH";
  locationName?: string | null;
  businessId: string;
  slug: string;
  businessName: string;
  shortDescription?: string | null;
  coverImageUrl?: string | null;
  averageRating: number;
  reviewCount: number;
  categoryNameFa: string;
  categoryNameEn: string;
  categorySlug: string;
  categoryIcon?: string | null;
  mapIcon: string;
  cityNameFa?: string | null;
  cityNameEn?: string | null;
  distanceMeters?: number | null;
};

export type BusinessMapLabels = {
  title: string;
  loading: string;
  error: string;
  truncated: string;
  clusterResults: string;
  viewBusiness: string;
  reviews: string;
};

type Props = {
  filters: BusinessDirectoryFilters;
  location: LocationValue | null;
  radiusKm: RadiusKm | null;
  locale: "de" | "en" | "fa";
  labels: BusinessMapLabels;
};

type MapData = FeatureCollection<Point, MapProperties> & { truncated?: boolean };

function localized(properties: MapProperties, locale: Props["locale"]) {
  return {
    category: locale === "fa" ? properties.categoryNameFa : properties.categoryNameEn,
    city: locale === "fa" ? properties.cityNameFa : properties.cityNameEn,
  };
}

function businessCardElement(properties: MapProperties, locale: Props["locale"], labels: BusinessMapLabels) {
  const names = localized(properties, locale);
  const card = document.createElement("article");
  card.className = "business-map-card";

  if (properties.coverImageUrl) {
    const image = document.createElement("img");
    image.src = properties.coverImageUrl;
    image.alt = properties.businessName;
    image.loading = "lazy";
    card.append(image);
  }

  const body = document.createElement("div");
  body.className = "business-map-card__body";
  const title = document.createElement("strong");
  title.textContent = properties.businessName;
  const meta = document.createElement("p");
  meta.textContent = [names.category, names.city].filter(Boolean).join(" · ");
  const rating = document.createElement("p");
  rating.className = "business-map-card__rating";
  rating.textContent = `★ ${Number(properties.averageRating ?? 0).toFixed(1)} · ${properties.reviewCount ?? 0} ${labels.reviews}`;
  const link = document.createElement("a");
  link.href = `/businesses/${encodeURIComponent(properties.slug)}`;
  link.textContent = labels.viewBusiness;
  body.append(title, meta, rating, link);
  card.append(body);
  return card;
}

export function BusinessMap({ filters, location, radiusKm, locale, labels }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapboxRef = useRef<typeof mapboxgl | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      import("mapbox-gl"),
      fetch("/api/geo/map-config", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("config");
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
        center: [10.4515, 51.1657],
        zoom: 5,
        attributionControl: true,
      });
      mapRef.current = map;
      map.addControl(new mapbox.NavigationControl(), "top-left");
      map.addControl(new mapbox.FullscreenControl(), "top-left");
      map.on("load", () => {
        map.addSource("businesses", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          cluster: true,
          clusterMaxZoom: 18,
          clusterRadius: 52,
          generateId: true,
        });
        map.addLayer({
          id: "business-clusters",
          type: "circle",
          source: "businesses",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#f97360",
            "circle-radius": ["step", ["get", "point_count"], 20, 10, 25, 50, 32],
            "circle-stroke-width": 7,
            "circle-stroke-color": "rgba(249,115,96,0.25)",
          },
        });
        map.addLayer({
          id: "business-cluster-count",
          type: "symbol",
          source: "businesses",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 13,
          },
          paint: { "text-color": "#ffffff" },
        });
        map.addLayer({
          id: "business-points",
          type: "circle",
          source: "businesses",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "#f97360",
            "circle-radius": 17,
            "circle-stroke-width": 4,
            "circle-stroke-color": "#ffffff",
          },
        });
        map.addLayer({
          id: "business-point-icons",
          type: "symbol",
          source: "businesses",
          filter: ["!", ["has", "point_count"]],
          layout: {
            "icon-image": ["get", "mapIcon"],
            "icon-size": 0.75,
            "icon-allow-overlap": true,
          },
          paint: { "icon-color": "#ffffff" },
        });

        map.on("click", "business-clusters", (event) => {
          const feature = map.queryRenderedFeatures(event.point, { layers: ["business-clusters"] })[0] as unknown as
            | Feature<Point, { cluster_id: number; point_count: number }>
            | undefined;
          if (!feature || feature.geometry.type !== "Point") return;
          const clusterId = Number(feature.properties?.cluster_id);
          const source = map.getSource("businesses") as mapboxgl.GeoJSONSource;
          source.getClusterExpansionZoom(clusterId, (zoomError, zoom) => {
            if (zoomError || zoom == null) return;
            if (zoom <= map.getZoom() + 0.25 || map.getZoom() >= 17.5) {
              source.getClusterLeaves(clusterId, 8, 0, (leavesError, leaves) => {
                if (leavesError || !leaves) return;
                const list = document.createElement("div");
                list.className = "business-map-cluster-list";
                const heading = document.createElement("strong");
                heading.textContent = labels.clusterResults.replace("{count}", String(feature.properties?.point_count ?? leaves.length));
                list.append(heading);
                leaves.forEach((leaf) => {
                  const business = leaf as Feature<Point, MapProperties>;
                  if (business.geometry.type !== "Point") return;
                  list.append(businessCardElement(business.properties, locale, labels));
                });
                popupRef.current?.remove();
                popupRef.current = new mapbox.Popup({ maxWidth: "340px" })
                  .setLngLat(feature.geometry.coordinates as [number, number])
                  .setDOMContent(list)
                  .addTo(map);
              });
              return;
            }
            map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom });
          });
        });

        map.on("click", "business-points", (event) => {
          const feature = event.features?.[0] as Feature<Point, MapProperties> | undefined;
          if (!feature) return;
          popupRef.current?.remove();
          popupRef.current = new mapbox.Popup({ offset: 18, maxWidth: "320px" })
            .setLngLat(feature.geometry.coordinates as [number, number])
            .setDOMContent(businessCardElement(feature.properties, locale, labels))
            .addTo(map);
        });
        for (const layer of ["business-clusters", "business-points"]) {
          map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
        }
        setReady(true);
      });
      map.on("error", () => setError(labels.error));
    }).catch(() => {
      if (!cancelled) {
        setError(labels.error);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      popupRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [labels, locale]);

  useEffect(() => {
    if (!ready || !mapRef.current || !mapboxRef.current) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const origin = location
      ? {
          latitude: location.latitude,
          longitude: location.longitude,
          ...(radiusKm !== null && { radiusKm }),
        }
      : undefined;
    void fetch("/api/businesses/map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: filters.categoryId,
        subCategoryId: filters.subCategoryId,
        cityId: filters.cityId,
        search: filters.search,
        origin,
      }),
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("map-data");
      return response.json() as Promise<{ data: MapData }>;
    }).then(({ data }) => {
      const map = mapRef.current;
      const mapbox = mapboxRef.current;
      if (!map || !mapbox) return;
      (map.getSource("businesses") as mapboxgl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: data.features,
      });
      setTruncated(Boolean(data.truncated));
      if (data.features.length === 1) {
        map.easeTo({ center: data.features[0].geometry.coordinates as [number, number], zoom: 13 });
      } else if (data.features.length > 1) {
        const bounds = new mapbox.LngLatBounds();
        data.features.forEach((feature) => bounds.extend(feature.geometry.coordinates as [number, number]));
        map.fitBounds(bounds, { padding: 55, maxZoom: 14, duration: 700 });
      }
    }).catch((requestError) => {
      if ((requestError as Error).name !== "AbortError") setError(labels.error);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [
    filters.categoryId,
    filters.cityId,
    filters.search,
    filters.subCategoryId,
    labels.error,
    location,
    radiusKm,
    ready,
  ]);

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-gray-200 bg-[#eef1f2] shadow-[0_14px_35px_rgba(17,24,39,0.08)]">
      <div ref={containerRef} role="region" aria-label={labels.title} className="h-[360px] w-full sm:h-[440px] lg:h-[500px]" />
      {loading ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/35 backdrop-blur-[1px]">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-lg"><FiLoader className="animate-spin text-primary" />{labels.loading}</span>
        </div>
      ) : null}
      {error ? <p role="alert" className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg">{error}</p> : null}
      {truncated ? <p className="absolute bottom-4 right-4 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow"><FiMapPin className="me-1 inline text-primary" />{labels.truncated}</p> : null}
    </div>
  );
}
