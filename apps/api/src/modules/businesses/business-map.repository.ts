import { Prisma } from "@fargo/database";
import type { BusinessMapBody } from "@fargo/shared";

import { prisma } from "../../lib/prisma.js";

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
  balance: "courthouse",
  "home-repair": "hardware",
  car: "car",
  storefront: "shop",
  school: "school",
  medical: "hospital",
  celebration: "theatre",
  flight: "airport",
};

export async function findBusinessMapPoints(input: BusinessMapBody) {
  const conditions = [
    Prisma.sql`b."status" = 'ACTIVE'::"business_status"`,
    Prisma.sql`bl."active" = TRUE`,
  ];
  let originPoint: Prisma.Sql | null = null;

  if (input.categoryId) conditions.push(Prisma.sql`b."categoryId" = ${input.categoryId}`);
  if (input.subCategoryId) conditions.push(Prisma.sql`b."subCategoryId" = ${input.subCategoryId}`);
  if (input.cityId) conditions.push(Prisma.sql`bl."cityId" = ${input.cityId}`);
  if (input.search) {
    const term = `%${input.search}%`;
    conditions.push(Prisma.sql`(b."businessName" ILIKE ${term} OR b."shortDescription" ILIKE ${term})`);
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
      b."id" AS "businessId", b."slug", b."businessName", b."shortDescription", b."coverImageUrl",
      b."averageRating", b."reviewCount",
      category."nameFa" AS "categoryNameFa", category."nameEn" AS "categoryNameEn",
      category."slug" AS "categorySlug", category."icon" AS "categoryIcon",
      city."nameFa" AS "cityNameFa", city."nameEn" AS "cityNameEn",
      ${distance} AS "distanceMeters"
    FROM "business_locations" bl
    JOIN "businesses" b ON b."id" = bl."businessId"
    JOIN "categories" category ON category."id" = b."categoryId"
    LEFT JOIN "cities" city ON city."id" = bl."cityId"
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
        mapIcon: row.categoryIcon ? mapIconByCategory[row.categoryIcon] ?? "marker" : "marker",
        cityNameFa: row.cityNameFa,
        cityNameEn: row.cityNameEn,
        distanceMeters: row.distanceMeters,
      },
    })),
  };
}
