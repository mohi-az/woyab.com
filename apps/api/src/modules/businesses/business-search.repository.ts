import { Prisma } from "@woyab/database";
import type { BusinessSearchBody } from "@woyab/shared";

import { prisma } from "../../lib/prisma.js";
import { appLocaleToContentLocale } from "./business-localization.js";
import { currentlyOpenBusinessCondition } from "./business-hours.repository.js";

export type SpatialBusinessMatch = {
  businessId: string;
  distanceMeters: number;
  locationId: string;
  locationType: "PRIMARY" | "BRANCH";
  locationName: string | null;
  cityNameEn: string | null;
  cityNameFa: string | null;
  businessName: string;
  shortDescription: string | null;
  featured: boolean;
};

type InternalBusinessSearchBody = BusinessSearchBody & { openBusinessIds?: string[] };

function spatialConditions(input: InternalBusinessSearchBody) {
  const { origin } = input;
  if (!origin) throw new Error("Spatial search requires an origin");

  const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${origin.longitude}, ${origin.latitude}), 4326)::geography`;
  const requestedLocale = appLocaleToContentLocale(input.locale);
  const conditions = [
    Prisma.sql`b."status" = 'ACTIVE'::"business_status"`,
    Prisma.sql`b."verified" = TRUE`,
    Prisma.sql`b."removedAt" IS NULL`,
    Prisma.sql`bl."active" = TRUE`,
    // Do not surface corrupt locations whose coordinates are hundreds of
    // kilometres away from their assigned city. Keep the check permissive
    // enough for metro areas and records whose city has no coordinates.
    Prisma.sql`(
      city."latitude" IS NULL OR city."longitude" IS NULL OR
      ST_DWithin(
        bl."geo_point",
        ST_SetSRID(ST_MakePoint(city."longitude", city."latitude"), 4326)::geography,
        100000
      )
    )`,
  ];

  if (origin.radiusKm !== undefined) {
    conditions.push(Prisma.sql`ST_DWithin(bl."geo_point", ${point}, ${origin.radiusKm * 1000})`);
  }

  if (input.categoryId) conditions.push(Prisma.sql`b."categoryId" = ${input.categoryId}`);
  if (input.subCategoryId) conditions.push(Prisma.sql`b."subCategoryId" = ${input.subCategoryId}`);
  if (input.cityId) conditions.push(Prisma.sql`bl."cityId" = ${input.cityId}`);
  if (input.favoriteBusinessIds) {
    conditions.push(input.favoriteBusinessIds.length
      ? Prisma.sql`b."id" IN (${Prisma.join(input.favoriteBusinessIds)})`
      : Prisma.sql`FALSE`);
  }
  if (input.openBusinessIds) {
    conditions.push(input.openBusinessIds.length
      ? Prisma.sql`b."id" IN (${Prisma.join(input.openBusinessIds)})`
      : Prisma.sql`FALSE`);
  } else if (input.openNow) {
    conditions.push(currentlyOpenBusinessCondition());
  }
  if (input.search) {
    const term = `%${input.search}%`;
    conditions.push(Prisma.sql`(
      b."businessName" ILIKE ${term}
      OR b."shortDescription" ILIKE ${term}
      OR EXISTS (
        SELECT 1
        FROM "business_translations" bt_search
        WHERE bt_search."businessId" = b."id"
          AND (
            bt_search."businessName" ILIKE ${term}
            OR bt_search."shortDescription" ILIKE ${term}
            OR bt_search."description" ILIKE ${term}
          )
      )
    )`);
  }

  return { point, where: Prisma.join(conditions, " AND "), requestedLocale };
}

export async function findNearbyBusinesses(input: InternalBusinessSearchBody) {
  const { point, where, requestedLocale } = spatialConditions(input);
  const skip = (input.page - 1) * input.limit;
  const orderBy = input.sortBy === "latest"
    ? Prisma.sql`"createdAt" DESC, "businessId" ASC`
    : input.sortBy === "oldest"
      ? Prisma.sql`"createdAt" ASC, "businessId" ASC`
      : input.sortBy === "popular"
        ? Prisma.sql`"popularityCount" DESC, "popularityRating" DESC, "createdAt" DESC, "businessId" ASC`
        : input.sortBy === "distance"
          ? Prisma.sql`"distanceMeters" ASC, "businessId" ASC`
          : Prisma.sql`"featured" DESC, "averageRating" DESC, "createdAt" DESC, "businessId" ASC`;

  const candidates = Prisma.sql`
    SELECT
      b."id" AS "businessId",
      bl."id" AS "locationId",
      bl."type"::text AS "locationType",
      bl."name" AS "locationName",
      city."nameEn" AS "cityNameEn",
      city."nameFa" AS "cityNameFa",
      COALESCE(bt_requested."businessName", bt_de."businessName", bt_en."businessName", bt_fa."businessName", bt_source."businessName", b."businessName") AS "businessName",
      COALESCE(bt_requested."shortDescription", bt_de."shortDescription", bt_en."shortDescription", bt_fa."shortDescription", bt_source."shortDescription", b."shortDescription") AS "shortDescription",
      b."featured" AS "featured",
      b."averageRating" AS "averageRating",
      COALESCE(b."googleUserRatingCount", b."reviewCount", 0) AS "popularityCount",
      COALESCE(b."googleRating", b."averageRating", 0) AS "popularityRating",
      b."createdAt" AS "createdAt",
      ST_Distance(bl."geo_point", ${point})::double precision AS "distanceMeters",
      ROW_NUMBER() OVER (
        PARTITION BY b."id"
        ORDER BY bl."geo_point" <-> ${point}, bl."isPrimary" DESC, bl."id"
      ) AS "locationRank"
    FROM "businesses" b
    JOIN "business_locations" bl ON bl."businessId" = b."id"
    LEFT JOIN "cities" city ON city."id" = bl."cityId"
    LEFT JOIN "business_translations" bt_requested
      ON bt_requested."businessId" = b."id" AND bt_requested."locale" = ${requestedLocale}::"content_locale"
    LEFT JOIN "business_translations" bt_de
      ON bt_de."businessId" = b."id" AND bt_de."locale" = 'DE'::"content_locale"
    LEFT JOIN "business_translations" bt_en
      ON bt_en."businessId" = b."id" AND bt_en."locale" = 'EN'::"content_locale"
    LEFT JOIN "business_translations" bt_fa
      ON bt_fa."businessId" = b."id" AND bt_fa."locale" = 'FA'::"content_locale"
    LEFT JOIN "business_translations" bt_source
      ON bt_source."businessId" = b."id" AND bt_source."locale" = b."sourceLocale"
    WHERE ${where}
  `;

  const [matches, countRows] = await Promise.all([
    prisma.$queryRaw<SpatialBusinessMatch[]>(Prisma.sql`
      WITH candidates AS (${candidates})
      SELECT
        "businessId", "locationId", "locationType", "locationName",
        "cityNameEn", "cityNameFa", "businessName", "shortDescription", "featured", "distanceMeters"
      FROM candidates
      WHERE "locationRank" = 1
      ORDER BY ${orderBy}
      OFFSET ${skip}
      LIMIT ${input.limit}
    `),
    prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
      WITH candidates AS (${candidates})
      SELECT COUNT(*)::integer AS "total"
      FROM candidates
      WHERE "locationRank" = 1
    `),
  ]);

  return { matches, total: countRows[0]?.total ?? 0 };
}
