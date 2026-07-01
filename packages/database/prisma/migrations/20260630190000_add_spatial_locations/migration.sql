CREATE EXTENSION IF NOT EXISTS postgis;

DO $$ BEGIN
  CREATE TYPE "business_location_type" AS ENUM ('PRIMARY', 'BRANCH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "location_provider" AS ENUM ('MANUAL', 'MAPBOX');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "saved_location_icon" AS ENUM ('HOME', 'WORK', 'FAVORITE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "business_locations" (
  "id" TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "type" "business_location_type" NOT NULL,
  "legacyBranchId" TEXT UNIQUE,
  "name" TEXT,
  "phone" TEXT,
  "mobile" TEXT,
  "address" TEXT,
  "postalCode" TEXT,
  "countryCode" TEXT NOT NULL DEFAULT 'DE',
  "latitude" DOUBLE PRECISION NOT NULL CHECK ("latitude" BETWEEN -90 AND 90),
  "longitude" DOUBLE PRECISION NOT NULL CHECK ("longitude" BETWEEN -180 AND 180),
  "geo_point" geography(Point, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
  ) STORED,
  "cityId" INTEGER REFERENCES "cities"("id"),
  "districtId" INTEGER REFERENCES "districts"("id"),
  "provider" "location_provider" NOT NULL DEFAULT 'MANUAL',
  "providerPlaceId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_locations_one_primary"
  ON "business_locations" ("businessId") WHERE "isPrimary" = TRUE;
CREATE INDEX IF NOT EXISTS "business_locations_businessId_idx" ON "business_locations"("businessId");
CREATE INDEX IF NOT EXISTS "business_locations_cityId_idx" ON "business_locations"("cityId");
CREATE INDEX IF NOT EXISTS "business_locations_districtId_idx" ON "business_locations"("districtId");
CREATE INDEX IF NOT EXISTS "business_locations_geo_point_gist" ON "business_locations" USING GIST ("geo_point");

CREATE TABLE IF NOT EXISTS "business_location_hours" (
  "id" SERIAL PRIMARY KEY,
  "locationId" TEXT NOT NULL REFERENCES "business_locations"("id") ON DELETE CASCADE,
  "dayOfWeek" "day_of_week" NOT NULL,
  "openTime" TEXT,
  "closeTime" TEXT,
  "isClosed" BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT "business_location_hours_locationId_dayOfWeek_key" UNIQUE ("locationId", "dayOfWeek")
);

CREATE TABLE IF NOT EXISTS "user_saved_locations" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "label" TEXT NOT NULL,
  "icon" "saved_location_icon" NOT NULL DEFAULT 'OTHER',
  "address" TEXT NOT NULL,
  "cityName" TEXT,
  "districtName" TEXT,
  "cityId" INTEGER REFERENCES "cities"("id"),
  "districtId" INTEGER REFERENCES "districts"("id"),
  "latitude" DOUBLE PRECISION NOT NULL CHECK ("latitude" BETWEEN -90 AND 90),
  "longitude" DOUBLE PRECISION NOT NULL CHECK ("longitude" BETWEEN -180 AND 180),
  "provider" "location_provider" NOT NULL DEFAULT 'MANUAL',
  "providerPlaceId" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_saved_locations_userId_label_key" UNIQUE ("userId", "label")
);

CREATE INDEX IF NOT EXISTS "user_saved_locations_userId_idx" ON "user_saved_locations"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "user_saved_locations_one_default"
  ON "user_saved_locations" ("userId") WHERE "isDefault" = TRUE;

INSERT INTO "business_locations" (
  "id", "businessId", "type", "name", "phone", "mobile", "address", "postalCode",
  "latitude", "longitude", "cityId", "districtId", "active", "isPrimary", "createdAt", "updatedAt"
)
SELECT
  'bl_main_' || b."id", b."id", 'PRIMARY'::"business_location_type", b."businessName",
  b."phone", b."mobile", b."address", b."postalCode", b."latitude", b."longitude",
  b."cityId", b."districtId", b."status" = 'ACTIVE'::"business_status", TRUE, b."createdAt", b."updatedAt"
FROM "businesses" b
WHERE b."latitude" IS NOT NULL AND b."longitude" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "business_locations" (
  "id", "businessId", "type", "legacyBranchId", "name", "phone", "mobile", "address",
  "postalCode", "latitude", "longitude", "cityId", "districtId", "active", "isPrimary", "createdAt", "updatedAt"
)
SELECT
  'bl_branch_' || br."id", br."businessId", 'BRANCH'::"business_location_type", br."id",
  br."name", br."phone", br."mobile", br."address", b."postalCode", br."latitude", br."longitude",
  COALESCE(br."cityId", b."cityId"), COALESCE(br."districtId", b."districtId"), br."active", FALSE,
  br."createdAt", br."updatedAt"
FROM "branches" br
JOIN "businesses" b ON b."id" = br."businessId"
WHERE br."latitude" IS NOT NULL AND br."longitude" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "business_location_hours" ("locationId", "dayOfWeek", "openTime", "closeTime", "isClosed")
SELECT 'bl_branch_' || bh."branchId", bh."dayOfWeek", bh."openTime", bh."closeTime", bh."isClosed"
FROM "branch_hours" bh
WHERE EXISTS (
  SELECT 1 FROM "business_locations" bl WHERE bl."id" = 'bl_branch_' || bh."branchId"
)
ON CONFLICT ("locationId", "dayOfWeek") DO NOTHING;

CREATE OR REPLACE FUNCTION sync_business_primary_location() RETURNS trigger AS $$
BEGIN
  IF NEW."latitude" IS NULL OR NEW."longitude" IS NULL THEN
    DELETE FROM "business_locations" WHERE "id" = 'bl_main_' || NEW."id";
    RETURN NEW;
  END IF;

  INSERT INTO "business_locations" (
    "id", "businessId", "type", "name", "phone", "mobile", "address", "postalCode",
    "latitude", "longitude", "cityId", "districtId", "active", "isPrimary", "createdAt", "updatedAt"
  ) VALUES (
    'bl_main_' || NEW."id", NEW."id", 'PRIMARY'::"business_location_type", NEW."businessName",
    NEW."phone", NEW."mobile", NEW."address", NEW."postalCode", NEW."latitude", NEW."longitude",
    NEW."cityId", NEW."districtId", NEW."status" = 'ACTIVE'::"business_status", TRUE, NEW."createdAt", NEW."updatedAt"
  )
  ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name", "phone" = EXCLUDED."phone", "mobile" = EXCLUDED."mobile",
    "address" = EXCLUDED."address", "postalCode" = EXCLUDED."postalCode",
    "latitude" = EXCLUDED."latitude", "longitude" = EXCLUDED."longitude",
    "cityId" = EXCLUDED."cityId", "districtId" = EXCLUDED."districtId",
    "active" = EXCLUDED."active", "updatedAt" = EXCLUDED."updatedAt";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS businesses_sync_primary_location ON "businesses";
CREATE TRIGGER businesses_sync_primary_location
AFTER INSERT OR UPDATE OF "businessName", "phone", "mobile", "address", "postalCode", "latitude", "longitude", "cityId", "districtId", "status"
ON "businesses" FOR EACH ROW EXECUTE FUNCTION sync_business_primary_location();

CREATE OR REPLACE FUNCTION sync_branch_location() RETURNS trigger AS $$
DECLARE
  parent_business "businesses"%ROWTYPE;
BEGIN
  IF NEW."latitude" IS NULL OR NEW."longitude" IS NULL THEN
    DELETE FROM "business_locations" WHERE "legacyBranchId" = NEW."id";
    RETURN NEW;
  END IF;

  SELECT * INTO parent_business FROM "businesses" WHERE "id" = NEW."businessId";
  INSERT INTO "business_locations" (
    "id", "businessId", "type", "legacyBranchId", "name", "phone", "mobile", "address", "postalCode",
    "latitude", "longitude", "cityId", "districtId", "active", "isPrimary", "createdAt", "updatedAt"
  ) VALUES (
    'bl_branch_' || NEW."id", NEW."businessId", 'BRANCH'::"business_location_type", NEW."id",
    NEW."name", NEW."phone", NEW."mobile", NEW."address", parent_business."postalCode",
    NEW."latitude", NEW."longitude", COALESCE(NEW."cityId", parent_business."cityId"),
    COALESCE(NEW."districtId", parent_business."districtId"), NEW."active", FALSE, NEW."createdAt", NEW."updatedAt"
  )
  ON CONFLICT ("id") DO UPDATE SET
    "businessId" = EXCLUDED."businessId", "name" = EXCLUDED."name", "phone" = EXCLUDED."phone",
    "mobile" = EXCLUDED."mobile", "address" = EXCLUDED."address", "postalCode" = EXCLUDED."postalCode",
    "latitude" = EXCLUDED."latitude", "longitude" = EXCLUDED."longitude",
    "cityId" = EXCLUDED."cityId", "districtId" = EXCLUDED."districtId",
    "active" = EXCLUDED."active", "updatedAt" = EXCLUDED."updatedAt";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS branches_sync_location ON "branches";
CREATE TRIGGER branches_sync_location
AFTER INSERT OR UPDATE OF "businessId", "name", "phone", "mobile", "address", "latitude", "longitude", "cityId", "districtId", "active"
ON "branches" FOR EACH ROW EXECUTE FUNCTION sync_branch_location();

CREATE OR REPLACE FUNCTION delete_branch_location() RETURNS trigger AS $$
BEGIN
  DELETE FROM "business_locations" WHERE "legacyBranchId" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS branches_delete_location ON "branches";
CREATE TRIGGER branches_delete_location
AFTER DELETE ON "branches" FOR EACH ROW EXECUTE FUNCTION delete_branch_location();

CREATE OR REPLACE FUNCTION sync_branch_location_hours() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "business_locations" WHERE "id" = 'bl_branch_' || NEW."branchId") THEN
    RETURN NEW;
  END IF;
  INSERT INTO "business_location_hours" ("locationId", "dayOfWeek", "openTime", "closeTime", "isClosed")
  VALUES ('bl_branch_' || NEW."branchId", NEW."dayOfWeek", NEW."openTime", NEW."closeTime", NEW."isClosed")
  ON CONFLICT ("locationId", "dayOfWeek") DO UPDATE SET
    "openTime" = EXCLUDED."openTime", "closeTime" = EXCLUDED."closeTime", "isClosed" = EXCLUDED."isClosed";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS branch_hours_sync_location_hours ON "branch_hours";
CREATE TRIGGER branch_hours_sync_location_hours
AFTER INSERT OR UPDATE OF "branchId", "dayOfWeek", "openTime", "closeTime", "isClosed"
ON "branch_hours" FOR EACH ROW EXECUTE FUNCTION sync_branch_location_hours();

CREATE OR REPLACE FUNCTION delete_branch_location_hours() RETURNS trigger AS $$
BEGIN
  DELETE FROM "business_location_hours"
  WHERE "locationId" = 'bl_branch_' || OLD."branchId" AND "dayOfWeek" = OLD."dayOfWeek";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS branch_hours_delete_location_hours ON "branch_hours";
CREATE TRIGGER branch_hours_delete_location_hours
AFTER DELETE ON "branch_hours" FOR EACH ROW EXECUTE FUNCTION delete_branch_location_hours();
