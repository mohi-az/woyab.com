DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'content_locale'
  ) THEN
    CREATE TYPE "content_locale" AS ENUM ('DE', 'EN', 'FA');
  END IF;
END $$;

ALTER TABLE "businesses"
ADD COLUMN IF NOT EXISTS "sourceLocale" "content_locale";

UPDATE "businesses"
SET "sourceLocale" = 'FA'::"content_locale"
WHERE "sourceLocale" IS NULL;

ALTER TABLE "businesses"
ALTER COLUMN "sourceLocale" SET DEFAULT 'DE'::"content_locale";

CREATE TABLE IF NOT EXISTS "business_translations" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "locale" "content_locale" NOT NULL,
  "businessName" TEXT NOT NULL,
  "shortDescription" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "business_translations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_translations_businessId_locale_key"
ON "business_translations"("businessId", "locale");

CREATE INDEX IF NOT EXISTS "business_translations_locale_idx"
ON "business_translations"("locale");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'business_translations_businessId_fkey'
  ) THEN
    ALTER TABLE "business_translations"
    ADD CONSTRAINT "business_translations_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "business_translations" (
  "id",
  "businessId",
  "locale",
  "businessName",
  "shortDescription",
  "description"
)
SELECT
  'bt_' || b."id" || '_fa',
  b."id",
  'FA'::"content_locale",
  b."businessName",
  b."shortDescription",
  b."description"
FROM "businesses" b
ON CONFLICT ("businessId", "locale") DO NOTHING;

WITH fa_source_content AS (
  SELECT
    b."id" AS "businessId",
    COALESCE(bt_fa."businessName", b."businessName") AS "businessName",
    COALESCE(bt_fa."shortDescription", b."shortDescription") AS "shortDescription",
    COALESCE(bt_fa."description", b."description") AS "description"
  FROM "businesses" b
  LEFT JOIN "business_translations" bt_fa
    ON bt_fa."businessId" = b."id"
   AND bt_fa."locale" = 'FA'::"content_locale"
)
INSERT INTO "business_translations" (
  "id",
  "businessId",
  "locale",
  "businessName",
  "shortDescription",
  "description"
)
SELECT
  'bt_' || src."businessId" || '_' || lower(target."locale"),
  src."businessId",
  target."locale"::"content_locale",
  src."businessName",
  src."shortDescription",
  src."description"
FROM fa_source_content src
CROSS JOIN (
  VALUES ('DE'), ('EN')
) AS target("locale")
ON CONFLICT ("businessId", "locale") DO NOTHING;

ALTER TABLE "businesses"
ALTER COLUMN "sourceLocale" SET NOT NULL;
