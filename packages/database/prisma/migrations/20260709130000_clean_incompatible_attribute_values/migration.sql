DELETE FROM "business_attributes" value
USING "attribute_definitions" definition
WHERE value."attributeId" = definition."id"
  AND definition."dataType" <> 'BOOLEAN'::"attribute_data_type"
  AND value."value" IN ('true', 'false');

DELETE FROM "business_attributes" value
USING "attribute_definitions" definition
WHERE value."attributeId" = definition."id"
  AND definition."dataType" = 'BOOLEAN'::"attribute_data_type"
  AND value."value" <> 'true';

DELETE FROM "business_attributes" value
USING "attribute_definitions" definition
WHERE value."attributeId" = definition."id"
  AND definition."dataType" = 'NUMBER'::"attribute_data_type"
  AND value."value" !~ '^-?[0-9]+([.][0-9]+)?$';

DELETE FROM "business_attributes" value
USING "attribute_definitions" definition
WHERE value."attributeId" = definition."id"
  AND definition."dataType" = 'MULTI_SELECT'::"attribute_data_type"
  AND value."value" !~ '^[[:space:]]*\[';
