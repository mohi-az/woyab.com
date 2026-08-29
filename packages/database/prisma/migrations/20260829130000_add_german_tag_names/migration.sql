ALTER TABLE "tags" ADD COLUMN "nameDe" TEXT;

INSERT INTO "tags" ("nameFa", "nameEn", "nameDe", "slug")
VALUES ('کتاب‌فروشی', 'Bookshop', 'Buchhandlung', 'bookshop')
ON CONFLICT ("slug") DO UPDATE
SET "nameFa" = EXCLUDED."nameFa",
    "nameEn" = EXCLUDED."nameEn",
    "nameDe" = EXCLUDED."nameDe";
