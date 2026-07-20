BEGIN;

ALTER TABLE "users"
  ADD COLUMN "twoFactorSecretEncrypted" TEXT,
  ADD COLUMN "twoFactorEnabledAt" TIMESTAMP(3);

-- Existing accounts predate mandatory verification and are grandfathered to
-- avoid locking users out. New password registrations remain unverified.
UPDATE "users"
SET "emailVerified" = COALESCE("emailVerified", "createdAt")
WHERE "email" IS NOT NULL;

CREATE TABLE "email_verification_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_verification_tokens_tokenHash_key" ON "email_verification_tokens"("tokenHash");
CREATE INDEX "email_verification_tokens_userId_expiresAt_idx" ON "email_verification_tokens"("userId", "expiresAt");
ALTER TABLE "email_verification_tokens"
  ADD CONSTRAINT "email_verification_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "security_rate_limits" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "hits" INTEGER NOT NULL DEFAULT 1,
  "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "security_rate_limits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "security_rate_limits_action_keyHash_key" ON "security_rate_limits"("action", "keyHash");
CREATE INDEX "security_rate_limits_expiresAt_idx" ON "security_rate_limits"("expiresAt");

ALTER TABLE "reviews" DROP CONSTRAINT "reviews_userId_fkey";
ALTER TABLE "reviews" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "admin_audit_logs" DROP CONSTRAINT "admin_audit_logs_actorId_fkey";
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "business_claims" DROP CONSTRAINT "business_claims_claimantUserId_fkey";
ALTER TABLE "business_claims" ADD CONSTRAINT "business_claims_claimantUserId_fkey"
  FOREIGN KEY ("claimantUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "directory_reports" DROP CONSTRAINT "directory_reports_reporterUserId_fkey";
ALTER TABLE "directory_reports" ADD CONSTRAINT "directory_reports_reporterUserId_fkey"
  FOREIGN KEY ("reporterUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "review_owner_replies" DROP CONSTRAINT "review_owner_replies_ownerId_fkey";
ALTER TABLE "review_owner_replies" ADD CONSTRAINT "review_owner_replies_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
