-- Product ranges belong to business tags, not operational amenities.
-- Create the canonical tags before moving any existing boolean selections.
INSERT INTO "tags" ("nameFa", "nameEn", "slug")
VALUES
  ('صنایع‌دستی', 'Handicrafts', 'handicrafts'),
  ('کالاهای خانگی', 'Household goods', 'household-goods')
ON CONFLICT DO NOTHING;

INSERT INTO "business_tags" ("businessId", "tagId")
SELECT value."businessId", tag."id"
FROM "business_attributes" value
JOIN "attribute_definitions" definition ON definition."id" = value."attributeId"
JOIN "tags" tag ON tag."nameFa" = definition."labelFa"
WHERE definition."key" IN ('handicrafts_available', 'household_goods')
  AND LOWER(TRIM(value."value")) IN ('true', '1', 'yes', 'on')
ON CONFLICT DO NOTHING;

DELETE FROM "business_attributes"
WHERE "attributeId" IN (
  SELECT "id"
  FROM "attribute_definitions"
  WHERE "key" IN ('handicrafts_available', 'household_goods')
);

DELETE FROM "attribute_definitions"
WHERE "key" IN ('handicrafts_available', 'household_goods');
