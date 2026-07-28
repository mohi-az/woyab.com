import { Prisma } from "@fargo/database";
import type { BusinessMapBody } from "@fargo/shared";

import { prisma } from "../../lib/prisma.js";
import { appLocaleToContentLocale } from "./business-localization.js";
import { currentlyOpenBusinessCondition } from "./business-hours.repository.js";

type BusinessMapRow = {
  locationId: string;
  locationType: "PRIMARY" | "BRANCH";
  locationName: string | null;
  latitude: number;
  longitude: number;
  businessId: string;
  slug: string;
  businessName: string;
  shortDescription: string | null;
  coverImageUrl: string | null;
  averageRating: number;
  reviewCount: number;
  categoryNameFa: string;
  categoryNameEn: string;
  categorySlug: string;
  categoryIcon: string | null;
  cityNameFa: string | null;
  cityNameEn: string | null;
  distanceMeters: number | null;
};

const mapIconByCategory: Record<string, string> = {
  restaurant: "restaurant",
  spa: "hairdresser",
  balance: "bank",
  "legal-financial": "bank",
  "home-repair": "hardware",
  "home-services": "hardware",
  car: "car",
  automotive: "car",
  storefront: "shop",
  retail: "shop",
  school: "school",
  education: "school",
  medical: "hospital",
  "beauty-wellness": "hairdresser",
  "restaurants-cafes": "restaurant",
  celebration: "theatre",
  "media-events": "theatre",
  flight: "airport",
  "travel-transport": "airport",
};

const mapGlyphByCategorySlug: Record<string, string> = {
  "legal-financial": "\u2696",
};

export async function findBusinessMapPoints(input: BusinessMapBody) {
  const requestedLocale = appLocaleToContentLocale(input.locale);
  const conditions = [
    Prisma.sql`b."status" = 'ACTIVE'::"business_status"`,
    Prisma.sql`b."verified" = TRUE`,
    Prisma.sql`b."removedAt" IS NULL`,
    Prisma.sql`bl."active" = TRUE`,
    Prisma.sql`(
      city."latitude" IS NULL OR city."longitude" IS NULL OR
      ST_DWithin(
        bl."geo_point",
        ST_SetSRID(ST_MakePoint(city."longitude", city."latitude"), 4326)::geography,
        100000
      )
    )`,
  ];
  let originPoint: Prisma.Sql | null = null;

  if (input.categoryId) conditions.push(Prisma.sql`b."categoryId" = ${input.categoryId}`);
  if (input.subCategoryId) conditions.push(Prisma.sql`b."subCategoryId" = ${input.subCategoryId}`);
  if (input.cityId) conditions.push(Prisma.sql`bl."cityId" = ${input.cityId}`);
  if (input.favoriteBusinessIds) {
    conditions.push(input.favoriteBusinessIds.length
      ? Prisma.sql`b."id" IN (${Prisma.join(input.favoriteBusinessIds)})`
      : Prisma.sql`FALSE`);
  }
  if (input.openNow) conditions.push(currentlyOpenBusinessCondition());
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
  if (input.origin) {
    originPoint = Prisma.sql`ST_SetSRID(ST_MakePoint(${input.origin.longitude}, ${input.origin.latitude}), 4326)::geography`;
    if (input.origin.radiusKm !== undefined) {
      conditions.push(Prisma.sql`ST_DWithin(bl."geo_point", ${originPoint}, ${input.origin.radiusKm * 1000})`);
    }
  }
  if (input.bounds) {
    conditions.push(Prisma.sql`ST_Intersects(
      bl."geo_point"::geometry,
      ST_MakeEnvelope(${input.bounds.west}, ${input.bounds.south}, ${input.bounds.east}, ${input.bounds.north}, 4326)
    )`);
  }

  const distance = originPoint
    ? Prisma.sql`ST_Distance(bl."geo_point", ${originPoint})::double precision`
    : Prisma.sql`NULL::double precision`;
  const rows = await prisma.$queryRaw<BusinessMapRow[]>(Prisma.sql`
    SELECT
      bl."id" AS "locationId",
      bl."type"::text AS "locationType",
      bl."name" AS "locationName",
      bl."latitude", bl."longitude",
      b."id" AS "businessId", b."slug",
      COALESCE(bt_requested."businessName", bt_de."businessName", bt_en."businessName", bt_fa."businessName", bt_source."businessName", b."businessName") AS "businessName",
      COALESCE(bt_requested."shortDescription", bt_de."shortDescription", bt_en."shortDescription", bt_fa."shortDescription", bt_source."shortDescription", b."shortDescription") AS "shortDescription",
      b."coverImageUrl",
      b."averageRating", b."reviewCount",
      category."nameFa" AS "categoryNameFa", category."nameEn" AS "categoryNameEn",
      category."slug" AS "categorySlug", category."icon" AS "categoryIcon",
      city."nameFa" AS "cityNameFa", city."nameEn" AS "cityNameEn",
      ${distance} AS "distanceMeters"
    FROM "business_locations" bl
    JOIN "businesses" b ON b."id" = bl."businessId"
    JOIN "categories" category ON category."id" = b."categoryId"
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
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY b."id", bl."isPrimary" DESC, bl."id"
    LIMIT 2001
  `);

  const truncated = rows.length > 2000;
  return {
    type: "FeatureCollection" as const,
    truncated,
    features: rows.slice(0, 2000).map((row) => ({
      type: "Feature" as const,
      id: row.locationId,
      geometry: { type: "Point" as const, coordinates: [row.longitude, row.latitude] },
      properties: {
        locationId: row.locationId,
        locationType: row.locationType,
        locationName: row.locationName,
        businessId: row.businessId,
        slug: row.slug,
        businessName: row.businessName,
        shortDescription: row.shortDescription,
        coverImageUrl: row.coverImageUrl,
        averageRating: row.averageRating,
        reviewCount: row.reviewCount,
        categoryNameFa: row.categoryNameFa,
        categoryNameEn: row.categoryNameEn,
        categorySlug: row.categorySlug,
        categoryIcon: row.categoryIcon,
        mapIcon: mapIconByCategory[row.categoryIcon ?? ""] ?? mapIconByCategory[row.categorySlug] ?? "marker",
        mapGlyph: mapGlyphByCategorySlug[row.categorySlug] ?? null,
        cityNameFa: row.cityNameFa,
        cityNameEn: row.cityNameEn,
        distanceMeters: row.distanceMeters,
      },
    })),
  };
}
