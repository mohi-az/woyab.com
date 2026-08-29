UPDATE "tags"
SET "nameEn" = 'Breakfast',
    "nameDe" = 'Frühstück'
WHERE "slug" = 'legacy-specialty-5';

DELETE FROM "tags"
WHERE "slug" = 'legacy-specialty-6';
