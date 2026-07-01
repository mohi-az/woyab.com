CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
  CREATE TYPE "location_catalog_kind" AS ENUM ('CITY', 'DISTRICT', 'LOCALITY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "location_catalog_entries" (
  "id" SERIAL PRIMARY KEY,
  "source" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "asciiName" TEXT,
  "alternateNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "searchText" TEXT NOT NULL,
  "featureCode" TEXT NOT NULL,
  "kind" "location_catalog_kind" NOT NULL,
  "countryCode" TEXT NOT NULL DEFAULT 'DE',
  "admin1Code" TEXT,
  "admin1Name" TEXT,
  "parentName" TEXT,
  "latitude" DOUBLE PRECISION NOT NULL CHECK ("latitude" BETWEEN -90 AND 90),
  "longitude" DOUBLE PRECISION NOT NULL CHECK ("longitude" BETWEEN -180 AND 180),
  "geo_point" geography(Point, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
  ) STORED,
  "population" BIGINT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "location_catalog_entries_source_sourceId_key" UNIQUE ("source", "sourceId")
);

CREATE INDEX IF NOT EXISTS "location_catalog_entries_countryCode_kind_idx"
  ON "location_catalog_entries"("countryCode", "kind");
CREATE INDEX IF NOT EXISTS "location_catalog_entries_search_text_trgm_idx"
  ON "location_catalog_entries" USING GIN ("searchText" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "location_catalog_entries_geo_point_gist"
  ON "location_catalog_entries" USING GIST ("geo_point");
