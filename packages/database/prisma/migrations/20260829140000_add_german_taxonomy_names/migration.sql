ALTER TABLE "categories" ADD COLUMN "nameDe" TEXT;
ALTER TABLE "sub_categories" ADD COLUMN "nameDe" TEXT;

UPDATE "categories" AS category
SET "nameDe" = translations."nameDe"
FROM (
  VALUES
    ('restaurants-cafes', 'Restaurants und Cafés'),
    ('beauty-wellness', 'Schönheit und Wellness'),
    ('legal-financial', 'Rechts- und Finanzdienstleistungen'),
    ('home-services', 'Haushaltsdienstleistungen'),
    ('automotive', 'Automobil'),
    ('retail', 'Einzelhandel'),
    ('education', 'Bildung'),
    ('medical', 'Medizin'),
    ('media-events', 'Medien und Veranstaltungen'),
    ('travel-transport', 'Reisen und Transport')
) AS translations("slug", "nameDe")
WHERE category."slug" = translations."slug";

UPDATE "sub_categories" AS sub_category
SET "nameDe" = translations."nameDe"
FROM (
  VALUES
    ('cafe', 'Café'),
    ('bakery', 'Bäckerei'),
    ('hair-salon', 'Friseursalon'),
    ('aesthetic-clinic', 'Ästhetische Klinik'),
    ('spa-massage', 'Spa und Massage'),
    ('law-office', 'Anwaltskanzlei'),
    ('accounting', 'Buchhaltung'),
    ('insurance', 'Versicherung'),
    ('plumbing', 'Sanitär- und Klempnerarbeiten'),
    ('electrical', 'Elektroarbeiten'),
    ('cleaning', 'Reinigung'),
    ('repair-shop', 'Autowerkstatt'),
    ('car-wash', 'Autowäsche'),
    ('car-dealer', 'Autohandel'),
    ('iranian-grocery', 'Iranischer Lebensmittelmarkt'),
    ('clothing', 'Bekleidung'),
    ('home-appliances', 'Haushaltsgeräte'),
    ('language-school', 'Sprachschule'),
    ('music-school', 'Musikschule'),
    ('driving-school', 'Fahrschule'),
    ('dental-clinic', 'Zahnarztpraxis'),
    ('general-practitioner', 'Hausarztpraxis'),
    ('psychology', 'Psychologie'),
    ('photo-studio', 'Fotostudio'),
    ('videography', 'Videografie'),
    ('event-planning', 'Veranstaltungsplanung'),
    ('travel-agency', 'Reisebüro'),
    ('transport', 'Transport'),
    ('car-rental', 'Autovermietung')
) AS translations("slug", "nameDe")
WHERE sub_category."slug" = translations."slug";
