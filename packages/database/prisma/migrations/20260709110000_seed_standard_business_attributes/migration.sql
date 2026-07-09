INSERT INTO "attribute_definitions" ("key", "labelFa", "labelEn", "dataType", "unit", "options", "sortOrder", "active")
VALUES
  ('has_parking', 'پارکینگ', 'Parking', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 10, TRUE),
  ('free_parking', 'پارکینگ رایگان', 'Free parking', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 20, TRUE),
  ('wheelchair_accessible', 'دسترسی ویلچر', 'Wheelchair accessible', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 30, TRUE),
  ('elevator_access', 'دسترسی آسانسور', 'Elevator access', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 40, TRUE),

  ('delivery_available', 'ارسال / دلیوری', 'Delivery', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 110, TRUE),
  ('takeaway_available', 'امکان بیرون‌بر', 'Takeaway available', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 120, TRUE),
  ('home_visit', 'ویزیت یا خدمات در محل', 'Home visit or on-site service', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 130, TRUE),
  ('online_service', 'خدمات آنلاین', 'Online service', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 140, TRUE),
  ('in_person_service', 'خدمات حضوری', 'In-person service', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 150, TRUE),
  ('same_day_service', 'خدمات همان روز', 'Same-day service', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 160, TRUE),
  ('emergency_service', 'خدمات فوری / اضطراری', 'Emergency service', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 170, TRUE),
  ('open_24_7', 'فعالیت ۲۴ ساعته', 'Open 24/7', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 180, TRUE),

  ('online_booking', 'رزرو آنلاین', 'Online booking', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 210, TRUE),
  ('walk_ins_welcome', 'پذیرش بدون نوبت', 'Walk-ins welcome', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 220, TRUE),
  ('appointment_required', 'نیاز به تعیین وقت', 'Appointment required', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 230, TRUE),
  ('free_consultation', 'ویزیت یا مشاوره رایگان', 'Free consultation', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 240, TRUE),

  ('accepts_card', 'پرداخت با کارت', 'Card payment', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 310, TRUE),
  ('online_payment', 'پرداخت آنلاین', 'Online payment', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 320, TRUE),
  ('cash_payment', 'پرداخت نقدی', 'Cash payment', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 330, TRUE),

  ('wifi_available', 'وای‌فای', 'Wi-Fi available', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 410, TRUE),
  ('restroom_available', 'سرویس بهداشتی', 'Restroom available', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 420, TRUE),
  ('air_conditioning', 'تهویه مطبوع', 'Air conditioning', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 430, TRUE),
  ('outdoor_seating', 'فضای باز / نشستن بیرون', 'Outdoor seating', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 440, TRUE),
  ('private_rooms', 'اتاق یا فضای خصوصی', 'Private rooms', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 450, TRUE),
  ('family_friendly', 'مناسب خانواده', 'Family friendly', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 460, TRUE),
  ('pet_friendly', 'ورود حیوانات خانگی مجاز', 'Pet friendly', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 470, TRUE),
  ('children_play_area', 'فضای بازی کودک', 'Children play area', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 480, TRUE),
  ('women_only_service', 'خدمات ویژه بانوان', 'Women-only service', 'BOOLEAN'::"attribute_data_type", NULL, NULL, 490, TRUE)
ON CONFLICT ("key") DO UPDATE
SET
  "labelFa" = EXCLUDED."labelFa",
  "labelEn" = EXCLUDED."labelEn",
  "dataType" = EXCLUDED."dataType",
  "unit" = EXCLUDED."unit",
  "options" = EXCLUDED."options",
  "sortOrder" = EXCLUDED."sortOrder",
  "active" = EXCLUDED."active";
