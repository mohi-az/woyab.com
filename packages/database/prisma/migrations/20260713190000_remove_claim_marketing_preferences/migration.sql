BEGIN;

ALTER TABLE "business_claims"
  DROP COLUMN "marketingEmailsOptIn",
  DROP COLUMN "marketingEmailsOptInAt";

COMMIT;
