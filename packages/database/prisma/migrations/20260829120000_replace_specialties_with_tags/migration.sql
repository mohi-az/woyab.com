-- Preserve every existing specialty assignment as a business tag before
-- removing the redundant specialty taxonomy level.
INSERT INTO "tags" ("nameFa", "nameEn", "slug")
SELECT specialty."nameFa", specialty."nameEn", 'legacy-specialty-' || specialty."id"::text
FROM "specialties" specialty
WHERE NOT EXISTS (
  SELECT 1
  FROM "tags" tag
  WHERE tag."nameFa" = specialty."nameFa"
)
ON CONFLICT DO NOTHING;

INSERT INTO "business_tags" ("businessId", "tagId")
SELECT link."businessId", tag."id"
FROM "business_specialties" link
JOIN "specialties" specialty ON specialty."id" = link."specialtyId"
JOIN "tags" tag ON tag."nameFa" = specialty."nameFa"
ON CONFLICT DO NOTHING;

-- Include legacy rows that may only have the old single specialtyId populated.
INSERT INTO "business_tags" ("businessId", "tagId")
SELECT business."id", tag."id"
FROM "businesses" business
JOIN "specialties" specialty ON specialty."id" = business."specialtyId"
JOIN "tags" tag ON tag."nameFa" = specialty."nameFa"
WHERE business."specialtyId" IS NOT NULL
ON CONFLICT DO NOTHING;

DROP TABLE "business_specialties";
ALTER TABLE "businesses" DROP COLUMN "specialtyId";
DROP TABLE "specialties";
