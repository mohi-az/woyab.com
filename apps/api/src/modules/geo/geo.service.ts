import { Prisma } from "@woyab/database";

import { env } from "../../config/env.js";
import { ApiError } from "../../errors/api-error.js";
import { prisma } from "../../lib/prisma.js";

type CatalogRow = {
  source: string;
  sourceId: string;
  name: string;
  kind: "CITY" | "DISTRICT" | "LOCALITY";
  admin1Name: string | null;
  parentName: string | null;
  latitude: number;
  longitude: number;
};

type NormalizedLocation = {
  providerId: string | null;
  label: string;
  latitude: number;
  longitude: number;
  city: string | null;
  district: string | null;
};

type NominatimReverseResponse = {
  place_id?: number | string;
  display_name?: string;
  address?: {
    road?: string;
    pedestrian?: string;
    footway?: string;
    path?: string;
    house_number?: string;
    neighbourhood?: string;
    suburb?: string;
    city_district?: string;
    borough?: string;
    quarter?: string;
    village?: string;
    town?: string;
    city?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

const NOMINATIM_MIN_INTERVAL_MS = 1_100;
const NOMINATIM_TIMEOUT_MS = 4_000;
const NOMINATIM_CACHE_LIMIT = 600;
const nominatimCache = new Map<string, NormalizedLocation | null>();
let nextNominatimRequestAt = 0;
let nominatimQueue = Promise.resolve();

function normalizeQuery(value: string) {
  return value.toLocaleLowerCase("de-DE").normalize("NFKD").replace(/\p{M}/gu, "");
}

function locationLabel(row: CatalogRow) {
  return [...new Set([row.name, row.parentName, row.admin1Name, "Deutschland"].filter(Boolean))].join(", ");
}

function normalizedLocation(row: CatalogRow, coordinates?: { latitude: number; longitude: number }) {
  const isDistrict = row.kind === "DISTRICT";
  return {
    providerId: `${row.source.toLocaleLowerCase()}:${row.sourceId}`,
    label: locationLabel(row),
    latitude: coordinates?.latitude ?? row.latitude,
    longitude: coordinates?.longitude ?? row.longitude,
    city: isDistrict ? row.parentName : row.name,
    district: isDistrict ? row.name : null,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cacheKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

function setNominatimCache(key: string, value: NormalizedLocation | null) {
  if (nominatimCache.size >= NOMINATIM_CACHE_LIMIT) {
    const oldestKey = nominatimCache.keys().next().value as string | undefined;
    if (oldestKey) nominatimCache.delete(oldestKey);
  }
  nominatimCache.set(key, value);
}

async function runNominatimRequest<T>(request: () => Promise<T>) {
  const queued = nominatimQueue.then(async () => {
    const waitMs = Math.max(0, nextNominatimRequestAt - Date.now());
    if (waitMs > 0) await sleep(waitMs);
    nextNominatimRequestAt = Date.now() + NOMINATIM_MIN_INTERVAL_MS;
    return request();
  });
  nominatimQueue = queued.then(() => undefined, () => undefined);
  return queued;
}

function compactParts(parts: Array<string | null | undefined>) {
  return [...new Set(parts.map((part) => part?.trim()).filter(Boolean))] as string[];
}

function normalizeNominatimAddress(
  data: NominatimReverseResponse,
  input: { latitude: number; longitude: number },
): NormalizedLocation | null {
  const address = data.address;
  if (!address) return null;

  const street = address.road ?? address.pedestrian ?? address.footway ?? address.path;
  const streetLine = street && address.house_number ? `${street} ${address.house_number}` : street;
  const streetAddress = compactParts([streetLine, address.postcode]).join(", ");
  const label = streetAddress || data.display_name;
  if (!label) return null;

  return {
    providerId: data.place_id ? `nominatim:${data.place_id}` : null,
    label,
    latitude: input.latitude,
    longitude: input.longitude,
    city: address.city ?? address.town ?? address.village ?? address.municipality ?? address.county ?? null,
    district: address.neighbourhood ?? address.suburb ?? address.city_district ?? address.borough ?? address.quarter ?? null,
  };
}

async function reverseWithNominatim(input: { latitude: number; longitude: number; language: "de" | "en" | "fa" }) {
  const key = cacheKey(input.latitude, input.longitude);
  if (nominatimCache.has(key)) return nominatimCache.get(key) ?? null;

  const result = await runNominatimRequest(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);
    try {
      const url = new URL(env.NOMINATIM_REVERSE_URL);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("lat", String(input.latitude));
      url.searchParams.set("lon", String(input.longitude));
      url.searchParams.set("zoom", "18");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("accept-language", input.language === "fa" ? "de,en" : `${input.language},de,en`);

      const response = await fetch(url, {
        headers: {
          "User-Agent": env.NOMINATIM_USER_AGENT,
          "Accept": "application/json",
        },
        signal: controller.signal,
      });
      if (!response.ok) return null;
      return normalizeNominatimAddress(await response.json() as NominatimReverseResponse, input);
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  });

  setNominatimCache(key, result);
  return result;
}

async function reverseWithCatalog(input: { latitude: number; longitude: number }) {
  const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography`;
  const rows = await prisma.$queryRaw<CatalogRow[]>(Prisma.sql`
    SELECT
      "source", "sourceId", "name", "kind"::text AS "kind",
      "admin1Name", "parentName", "latitude", "longitude"
    FROM "location_catalog_entries"
    WHERE "countryCode" = 'DE' AND ST_DWithin("geo_point", ${point}, 75000)
    ORDER BY "geo_point" <-> ${point}
    LIMIT 1
  `);
  const nearest = rows[0];
  if (!nearest) {
    return {
      providerId: null,
      label: `${input.latitude.toFixed(5)}, ${input.longitude.toFixed(5)}`,
      latitude: input.latitude,
      longitude: input.longitude,
      city: null,
      district: null,
    };
  }
  return normalizedLocation(nearest, input);
}

export const geoService = {
  mapConfig: () => {
    if (!env.MAPBOX_PUBLIC_TOKEN) throw ApiError.serviceUnavailable("Map display is not configured");
    return { accessToken: env.MAPBOX_PUBLIC_TOKEN, style: "mapbox://styles/mapbox/streets-v12" };
  },

  suggest: async (query: {
    q: string;
    language: "de" | "en" | "fa";
    proximityLatitude?: number;
    proximityLongitude?: number;
  }) => {
    const normalized = normalizeQuery(query.q);
    const contains = `%${normalized}%`;
    const prefix = `${normalized}%`;
    const proximity = query.proximityLatitude !== undefined && query.proximityLongitude !== undefined
      ? Prisma.sql`ST_SetSRID(ST_MakePoint(${query.proximityLongitude}, ${query.proximityLatitude}), 4326)::geography`
      : null;
    const distanceOrder = proximity
      ? Prisma.sql`ST_Distance("geo_point", ${proximity}) ASC,`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<CatalogRow[]>(Prisma.sql`
      SELECT
        "source", "sourceId", "name", "kind"::text AS "kind",
        "admin1Name", "parentName", "latitude", "longitude"
      FROM "location_catalog_entries"
      WHERE "countryCode" = 'DE' AND "searchText" ILIKE ${contains}
      ORDER BY
        LOWER("name") = LOWER(${query.q}) DESC,
        "searchText" ILIKE ${prefix} DESC,
        ${distanceOrder}
        CASE "kind"
          WHEN 'CITY'::"location_catalog_kind" THEN 0
          WHEN 'DISTRICT'::"location_catalog_kind" THEN 1
          ELSE 2
        END,
        "population" DESC,
        "name" ASC
      LIMIT 8
    `);

    return rows.map((row) => ({
      id: `${row.source.toLocaleLowerCase()}:${row.sourceId}`,
      ...normalizedLocation(row),
      primaryText: row.name,
      secondaryText: [...new Set([row.parentName, row.admin1Name, "Deutschland"].filter(Boolean))].join(", "),
      type: row.kind.toLocaleLowerCase(),
    }));
  },

  reverse: async (input: { latitude: number; longitude: number; language: "de" | "en" | "fa" }) => {
    const nominatimResult = await reverseWithNominatim(input).catch(() => null);
    return nominatimResult ?? reverseWithCatalog(input);
  },
};
