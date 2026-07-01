import { env } from "../../config/env.js";
import { ApiError } from "../../errors/api-error.js";

type MapboxContext = Record<string, { name?: string; mapbox_id?: string } | undefined>;

type MapboxSuggestion = {
  name?: string;
  mapbox_id?: string;
  feature_type?: string;
  address?: string;
  full_address?: string;
  place_formatted?: string;
};

type MapboxFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: MapboxSuggestion & { context?: MapboxContext };
};

function accessToken() {
  if (!env.MAPBOX_ACCESS_TOKEN) {
    throw ApiError.serviceUnavailable("Location search is not configured");
  }
  return env.MAPBOX_ACCESS_TOKEN;
}

async function mapboxJson<T>(url: URL): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw ApiError.serviceUnavailable("Location provider is temporarily unavailable");
  }
  return response.json() as Promise<T>;
}

function contextName(context: MapboxContext | undefined, keys: string[]) {
  for (const key of keys) {
    const name = context?.[key]?.name;
    if (name) return name;
  }
  return null;
}

function normalizeFeature(feature: MapboxFeature) {
  const properties = feature.properties ?? {};
  const coordinates = feature.geometry?.coordinates;
  if (!coordinates || coordinates.length < 2) {
    throw ApiError.serviceUnavailable("Location provider returned an invalid result");
  }

  return {
    providerId: properties.mapbox_id ?? null,
    label: properties.full_address ?? [properties.name, properties.place_formatted].filter(Boolean).join(", "),
    latitude: coordinates[1],
    longitude: coordinates[0],
    city: contextName(properties.context, ["place", "locality"]),
    district: contextName(properties.context, ["neighborhood", "district"]),
  };
}

export const geoService = {
  mapConfig: () => {
    const publicToken = env.MAPBOX_PUBLIC_TOKEN ??
      (env.MAPBOX_ACCESS_TOKEN?.startsWith("pk.") ? env.MAPBOX_ACCESS_TOKEN : undefined);
    if (!publicToken) throw ApiError.serviceUnavailable("Map display is not configured");
    return { accessToken: publicToken, style: "mapbox://styles/mapbox/streets-v12" };
  },

  suggest: async (query: {
    q: string;
    sessionToken: string;
    language: "de" | "en" | "fa";
    proximityLatitude?: number;
    proximityLongitude?: number;
  }) => {
    const url = new URL("https://api.mapbox.com/search/searchbox/v1/suggest");
    url.searchParams.set("q", query.q);
    url.searchParams.set("access_token", accessToken());
    url.searchParams.set("session_token", query.sessionToken);
    url.searchParams.set("country", env.MAPBOX_COUNTRY);
    url.searchParams.set("language", query.language);
    url.searchParams.set("types", "city,locality,neighborhood,address,street,postcode");
    url.searchParams.set("limit", "6");
    if (query.proximityLatitude !== undefined && query.proximityLongitude !== undefined) {
      url.searchParams.set("proximity", `${query.proximityLongitude},${query.proximityLatitude}`);
    }

    const data = await mapboxJson<{ suggestions?: MapboxSuggestion[] }>(url);
    return (data.suggestions ?? []).flatMap((suggestion) => {
      if (!suggestion.mapbox_id || !suggestion.name) return [];
      return [{
        id: suggestion.mapbox_id,
        label: suggestion.full_address ?? [suggestion.name, suggestion.place_formatted].filter(Boolean).join(", "),
        primaryText: suggestion.name,
        secondaryText: suggestion.place_formatted ?? "",
        type: suggestion.feature_type ?? "place",
      }];
    });
  },

  retrieve: async (query: { mapboxId: string; sessionToken: string; language: "de" | "en" | "fa" }) => {
    const url = new URL(`https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(query.mapboxId)}`);
    url.searchParams.set("access_token", accessToken());
    url.searchParams.set("session_token", query.sessionToken);
    url.searchParams.set("language", query.language);
    const data = await mapboxJson<{ features?: MapboxFeature[] }>(url);
    const feature = data.features?.[0];
    if (!feature) throw ApiError.notFound("Location not found");
    return normalizeFeature(feature);
  },

  reverse: async (input: { latitude: number; longitude: number; language: "de" | "en" | "fa" }) => {
    const url = new URL("https://api.mapbox.com/search/geocode/v6/reverse");
    url.searchParams.set("access_token", accessToken());
    url.searchParams.set("longitude", String(input.longitude));
    url.searchParams.set("latitude", String(input.latitude));
    url.searchParams.set("country", env.MAPBOX_COUNTRY);
    url.searchParams.set("language", input.language);
    url.searchParams.set("types", "address,neighborhood,locality,place");
    url.searchParams.set("limit", "1");
    const data = await mapboxJson<{ features?: MapboxFeature[] }>(url);
    const feature = data.features?.[0];
    if (!feature) {
      return {
        providerId: null,
        label: `${input.latitude.toFixed(5)}, ${input.longitude.toFixed(5)}`,
        latitude: input.latitude,
        longitude: input.longitude,
        city: null,
        district: null,
      };
    }
    return normalizeFeature(feature);
  },
};
