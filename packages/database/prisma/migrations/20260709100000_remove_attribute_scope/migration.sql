DROP INDEX IF EXISTS "attribute_definitions_key_subCategoryId_key";
DROP INDEX IF EXISTS "attribute_definitions_key_global_unique";
DROP INDEX IF EXISTS "attribute_definitions_key_category_unique";
DROP INDEX IF EXISTS "attribute_definitions_categoryId_idx";
DROP INDEX IF EXISTS "attribute_definitions_subCategoryId_idx";

ALTER TABLE "attribute_definitions" DROP CONSTRAINT IF EXISTS "attribute_definitions_categoryId_fkey";
ALTER TABLE "attribute_definitions" DROP CONSTRAINT IF EXISTS "attribute_definitions_subCategoryId_fkey";

WITH ranked AS (
  SELECT
    "id",
    "key",
    ROW_NUMBER() OVER (PARTITION BY "key" ORDER BY "id") AS row_number
  FROM "attribute_definitions"
)
UPDATE "attribute_definitions" attribute
SET "key" = attribute."key" || '_' || attribute."id"
FROM ranked
WHERE attribute."id" = ranked."id"
  AND ranked.row_number > 1;

ALTER TABLE "attribute_definitions" DROP COLUMN IF EXISTS "categoryId";
ALTER TABLE "attribute_definitions" DROP COLUMN IF EXISTS "subCategoryId";

CREATE UNIQUE INDEX IF NOT EXISTS "attribute_definitions_key_key" ON "attribute_definitions"("key");
