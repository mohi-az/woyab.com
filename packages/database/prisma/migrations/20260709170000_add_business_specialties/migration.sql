CREATE TABLE "business_specialties" (
  "businessId" TEXT NOT NULL,
  "specialtyId" INTEGER NOT NULL,

  CONSTRAINT "business_specialties_pkey" PRIMARY KEY ("businessId", "specialtyId")
);

INSERT INTO "business_specialties" ("businessId", "specialtyId")
SELECT "id", "specialtyId"
FROM "businesses"
WHERE "specialtyId" IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE "business_specialties"
  ADD CONSTRAINT "business_specialties_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "business_specialties"
  ADD CONSTRAINT "business_specialties_specialtyId_fkey"
  FOREIGN KEY ("specialtyId") REFERENCES "specialties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
