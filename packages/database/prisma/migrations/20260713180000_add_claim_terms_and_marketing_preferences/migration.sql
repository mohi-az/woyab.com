BEGIN;

ALTER TABLE "business_claims"
  ADD COLUMN "termsVersion" TEXT,
  ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "marketingEmailsOptIn" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "marketingEmailsOptInAt" TIMESTAMP(3);

COMMIT;
