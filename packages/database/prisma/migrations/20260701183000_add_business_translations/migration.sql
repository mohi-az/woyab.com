CREATE TYPE "content_locale" AS ENUM ('DE', 'EN', 'FA');

ALTER TABLE "businesses"
ADD COLUMN "sourceLocale" "content_locale" NOT NULL DEFAULT 'DE';

UPDATE "businesses"
SET "sourceLocale" = CASE
  WHEN COALESCE("businessName", '') ~ '[اآبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی]'
    OR COALESCE("shortDescription", '') ~ '[اآبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی]'
    OR COALESCE("description", '') ~ '[اآبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی]'
  THEN 'FA'::"content_locale"
  ELSE 'DE'::"content_locale"
END;

CREATE TABLE "business_translations" (
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

INSERT INTO "business_translations" (
  "id",
  "businessId",
  "locale",
  "businessName",
  "shortDescription",
  "description"
)
SELECT
  'bt_' || b."id",
  b."id",
  b."sourceLocale",
  b."businessName",
  b."shortDescription",
  b."description"
FROM "businesses" b
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX "business_translations_businessId_locale_key"
ON "business_translations"("businessId", "locale");

CREATE INDEX "business_translations_locale_idx"
ON "business_translations"("locale");

ALTER TABLE "business_translations"
ADD CONSTRAINT "business_translations_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
