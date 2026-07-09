UPDATE "attribute_definitions"
SET
  "dataType" = 'BOOLEAN'::"attribute_data_type",
  "unit" = NULL,
  "options" = NULL
WHERE "key" IN (
  'has_parking',
  'free_parking',
  'wheelchair_accessible',
  'elevator_access',
  'delivery_available',
  'takeaway_available',
  'home_visit',
  'online_service',
  'in_person_service',
  'same_day_service',
  'emergency_service',
  'open_24_7',
  'online_booking',
  'walk_ins_welcome',
  'appointment_required',
  'free_consultation',
  'accepts_card',
  'online_payment',
  'cash_payment',
  'wifi_available',
  'restroom_available',
  'air_conditioning',
  'outdoor_seating',
  'private_rooms',
  'family_friendly',
  'pet_friendly',
  'children_play_area',
  'women_only_service'
);

DELETE FROM "business_attributes" value
USING "attribute_definitions" definition
WHERE value."attributeId" = definition."id"
  AND definition."dataType" = 'BOOLEAN'::"attribute_data_type"
  AND value."value" <> 'true';
