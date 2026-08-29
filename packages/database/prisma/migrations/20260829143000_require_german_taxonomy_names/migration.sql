UPDATE "categories"
SET "nameDe" = "nameEn"
WHERE "nameDe" IS NULL OR BTRIM("nameDe") = '';

UPDATE "sub_categories"
SET "nameDe" = CASE
  WHEN "slug" = 'persian-restaurant' THEN 'Persisches Restaurant'
  ELSE "nameEn"
END
WHERE "nameDe" IS NULL OR BTRIM("nameDe") = '';

ALTER TABLE "categories" ALTER COLUMN "nameDe" SET NOT NULL;
ALTER TABLE "sub_categories" ALTER COLUMN "nameDe" SET NOT NULL;
