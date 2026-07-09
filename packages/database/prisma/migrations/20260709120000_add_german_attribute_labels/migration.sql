ALTER TABLE "attribute_definitions"
  ADD COLUMN IF NOT EXISTS "labelDe" TEXT;

UPDATE "attribute_definitions"
SET "labelDe" = updates."labelDe"
FROM (VALUES
  ('has_parking', 'Parkplatz'),
  ('free_parking', 'Kostenloser Parkplatz'),
  ('wheelchair_accessible', 'Rollstuhlgerecht'),
  ('elevator_access', 'Aufzug vorhanden'),

  ('delivery_available', 'Lieferung'),
  ('takeaway_available', 'Abholung möglich'),
  ('home_visit', 'Hausbesuch oder Vor-Ort-Service'),
  ('online_service', 'Online-Service'),
  ('in_person_service', 'Vor-Ort-Service'),
  ('same_day_service', 'Service am selben Tag'),
  ('emergency_service', 'Notfallservice'),
  ('open_24_7', '24/7 geöffnet'),

  ('online_booking', 'Online-Buchung'),
  ('walk_ins_welcome', 'Ohne Termin möglich'),
  ('appointment_required', 'Termin erforderlich'),
  ('free_consultation', 'Kostenlose Beratung'),

  ('accepts_card', 'Kartenzahlung'),
  ('online_payment', 'Online-Zahlung'),
  ('cash_payment', 'Barzahlung'),

  ('wifi_available', 'WLAN verfügbar'),
  ('restroom_available', 'Toilette vorhanden'),
  ('air_conditioning', 'Klimaanlage'),
  ('outdoor_seating', 'Außenbereich'),
  ('private_rooms', 'Private Räume'),
  ('family_friendly', 'Familienfreundlich'),
  ('pet_friendly', 'Haustierfreundlich'),
  ('children_play_area', 'Kinderspielbereich'),
  ('women_only_service', 'Service nur für Frauen')
) AS updates("key", "labelDe")
WHERE "attribute_definitions"."key" = updates."key";
