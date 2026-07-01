import { Prisma } from "@fargo/database";

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
  },
};
