UPDATE "attribute_definitions"
SET
  "unit" = NULL,
  "options" = NULL;

UPDATE "attribute_definitions"
SET "dataType" = 'TEXT'::"attribute_data_type"
WHERE "dataType" IN ('SELECT'::"attribute_data_type", 'MULTI_SELECT'::"attribute_data_type", 'DATE'::"attribute_data_type");
