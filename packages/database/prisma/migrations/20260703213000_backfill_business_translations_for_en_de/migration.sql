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
  WHERE b."sourceLocale" = 'FA'::"content_locale"
     OR bt_fa."id" IS NOT NULL
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
