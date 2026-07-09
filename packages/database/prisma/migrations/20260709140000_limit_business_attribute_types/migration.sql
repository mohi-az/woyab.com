UPDATE "attribute_definitions"
SET
  "dataType" = 'TEXT'::"attribute_data_type",
  "options" = NULL
WHERE "dataType" IN ('SELECT'::"attribute_data_type", 'MULTI_SELECT'::"attribute_data_type", 'DATE'::"attribute_data_type");

UPDATE "attribute_definitions"
SET "options" = NULL;

DELETE FROM "business_attributes" value
USING "attribute_definitions" definition
WHERE value."attributeId" = definition."id"
  AND definition."dataType" = 'NUMBER'::"attribute_data_type"
  AND value."value" !~ '^-?[0-9]+([.][0-9]+)?$';

DELETE FROM "business_attributes" value
USING "attribute_definitions" definition
WHERE value."attributeId" = definition."id"
  AND definition."dataType" = 'BOOLEAN'::"attribute_data_type"
  AND value."value" <> 'true';
