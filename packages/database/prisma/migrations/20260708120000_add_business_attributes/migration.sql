DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attribute_data_type') THEN
    CREATE TYPE "attribute_data_type" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'DATE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "attribute_definitions" (
  "id" SERIAL NOT NULL,
  "key" TEXT NOT NULL,
  "labelFa" TEXT NOT NULL,
  "labelEn" TEXT,
  "dataType" "attribute_data_type" NOT NULL,
  "unit" TEXT,
  "options" TEXT,
  "categoryId" INTEGER,
  "subCategoryId" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,

  CONSTRAINT "attribute_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "business_attributes" (
  "id" SERIAL NOT NULL,
  "businessId" TEXT NOT NULL,
  "attributeId" INTEGER NOT NULL,
  "value" TEXT NOT NULL,

  CONSTRAINT "business_attributes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "attribute_definitions_key_subCategoryId_key" ON "attribute_definitions"("key", "subCategoryId");
CREATE UNIQUE INDEX IF NOT EXISTS "attribute_definitions_key_global_unique" ON "attribute_definitions"("key") WHERE "categoryId" IS NULL AND "subCategoryId" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "attribute_definitions_key_category_unique" ON "attribute_definitions"("key", "categoryId") WHERE "categoryId" IS NOT NULL AND "subCategoryId" IS NULL;
CREATE INDEX IF NOT EXISTS "attribute_definitions_categoryId_idx" ON "attribute_definitions"("categoryId");
CREATE INDEX IF NOT EXISTS "attribute_definitions_subCategoryId_idx" ON "attribute_definitions"("subCategoryId");
CREATE INDEX IF NOT EXISTS "attribute_definitions_active_sortOrder_idx" ON "attribute_definitions"("active", "sortOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "business_attributes_businessId_attributeId_key" ON "business_attributes"("businessId", "attributeId");
CREATE INDEX IF NOT EXISTS "business_attributes_attributeId_idx" ON "business_attributes"("attributeId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attribute_definitions_categoryId_fkey'
  ) THEN
    ALTER TABLE "attribute_definitions"
      ADD CONSTRAINT "attribute_definitions_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attribute_definitions_subCategoryId_fkey'
  ) THEN
    ALTER TABLE "attribute_definitions"
      ADD CONSTRAINT "attribute_definitions_subCategoryId_fkey"
      FOREIGN KEY ("subCategoryId") REFERENCES "sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_attributes_attributeId_fkey'
  ) THEN
    ALTER TABLE "business_attributes"
      ADD CONSTRAINT "business_attributes_attributeId_fkey"
      FOREIGN KEY ("attributeId") REFERENCES "attribute_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_attributes_businessId_fkey'
  ) THEN
    ALTER TABLE "business_attributes"
      ADD CONSTRAINT "business_attributes_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "attribute_definitions" ("key", "labelFa", "labelEn", "dataType", "sortOrder", "active")
SELECT item."key", item."labelFa", item."labelEn", 'BOOLEAN'::"attribute_data_type", item."sortOrder", TRUE
FROM (VALUES
  ('has_parking', 'پارکینگ', 'Parking', 10),
  ('delivery_available', 'ارسال / دلیوری', 'Delivery', 20),
  ('free_consultation', 'ویزیت یا مشاوره رایگان', 'Free consultation', 30),
  ('online_booking', 'رزرو آنلاین', 'Online booking', 40),
  ('accepts_card', 'پرداخت با کارت', 'Card payment', 50),
  ('wheelchair_accessible', 'دسترسی ویلچر', 'Wheelchair accessible', 60),
  ('home_visit', 'ویزیت در محل', 'Home visit', 70),
  ('same_day_service', 'خدمات همان روز', 'Same-day service', 80)
) AS item("key", "labelFa", "labelEn", "sortOrder")
WHERE NOT EXISTS (
  SELECT 1
  FROM "attribute_definitions" existing
  WHERE existing."key" = item."key"
    AND existing."categoryId" IS NULL
    AND existing."subCategoryId" IS NULL
);
