BEGIN;

CREATE TYPE "business_claim_status_new" AS ENUM (
  'PENDING_VERIFICATION', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'SUPERSEDED'
);

ALTER TABLE "business_claims" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "business_claims" ALTER COLUMN "status" TYPE "business_claim_status_new"
  USING (CASE WHEN "status"::text = 'PENDING' THEN 'UNDER_REVIEW' ELSE "status"::text END)::"business_claim_status_new";
DROP TYPE "business_claim_status";
ALTER TYPE "business_claim_status_new" RENAME TO "business_claim_status";

CREATE TYPE "business_claim_verification_method" AS ENUM ('EMAIL_OTP');
CREATE TYPE "business_change_submitter_relation" AS ENUM ('OWNER', 'EMPLOYEE', 'CUSTOMER');
CREATE TYPE "business_change_request_kind" AS ENUM ('DETAILS', 'HOURS', 'ATTRIBUTES', 'TAGS', 'SERVICE_CREATE', 'SERVICE_UPDATE', 'SERVICE_DEACTIVATE');
CREATE TYPE "business_change_request_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

ALTER TABLE "business_claims"
  ALTER COLUMN "status" SET DEFAULT 'PENDING_VERIFICATION',
  ADD COLUMN "officialBusinessEmail" TEXT,
  ADD COLUMN "officialUrl" TEXT,
  ADD COLUMN "privacyNoticeVersion" TEXT,
  ADD COLUMN "privacyNoticeAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "otpHash" TEXT,
  ADD COLUMN "otpExpiresAt" TIMESTAMP(3),
  ADD COLUMN "otpAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "otpBlockedUntil" TIMESTAMP(3),
  ADD COLUMN "otpSentAt" TIMESTAMP(3),
  ADD COLUMN "otpSendCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "otpWindowStartedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "verificationMethod" "business_claim_verification_method",
  ADD COLUMN "emailMatchesListing" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "decisionReason" TEXT,
  ADD COLUMN "ownershipEndedAt" TIMESTAMP(3),
  ADD COLUMN "retentionReviewAt" TIMESTAMP(3),
  ADD COLUMN "legalHoldUntil" TIMESTAMP(3),
  ADD COLUMN "legalHoldReason" TEXT,
  ADD COLUMN "anonymizedAt" TIMESTAMP(3);

ALTER TABLE "businesses"
  ADD COLUMN "removedAt" TIMESTAMP(3),
  ADD COLUMN "removedById" TEXT,
  ADD COLUMN "restoredAt" TIMESTAMP(3);

CREATE TABLE "business_change_requests" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "submitterUserId" TEXT,
  "submitterRelation" "business_change_submitter_relation" NOT NULL,
  "kind" "business_change_request_kind" NOT NULL,
  "payloadVersion" INTEGER NOT NULL DEFAULT 1,
  "payload" JSONB NOT NULL,
  "snapshot" JSONB NOT NULL,
  "businessUpdatedAt" TIMESTAMP(3) NOT NULL,
  "additionalContext" TEXT,
  "evidenceUrl" TEXT,
  "status" "business_change_request_status" NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "decisionReason" TEXT,
  "retentionReviewAt" TIMESTAMP(3),
  "legalHoldUntil" TIMESTAMP(3),
  "legalHoldReason" TEXT,
  "anonymizedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_change_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "business_claims_retentionReviewAt_idx" ON "business_claims"("retentionReviewAt");
WITH ranked_active_claims AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "businessId", "claimantUserId"
    ORDER BY "createdAt" DESC, "id" DESC
  ) AS claim_rank
  FROM "business_claims"
  WHERE "claimantUserId" IS NOT NULL AND "status" = 'UNDER_REVIEW'
)
UPDATE "business_claims" AS claim
SET "status" = 'SUPERSEDED', "retentionReviewAt" = CURRENT_TIMESTAMP + INTERVAL '180 days'
FROM ranked_active_claims
WHERE claim."id" = ranked_active_claims."id" AND ranked_active_claims.claim_rank > 1;

CREATE UNIQUE INDEX "business_claims_active_claimant_business_key" ON "business_claims"("businessId", "claimantUserId")
  WHERE "claimantUserId" IS NOT NULL AND "status" IN ('PENDING_VERIFICATION', 'UNDER_REVIEW');
CREATE INDEX "businesses_removedAt_idx" ON "businesses"("removedAt");
CREATE INDEX "businesses_removedById_idx" ON "businesses"("removedById");
CREATE INDEX "business_change_requests_businessId_status_idx" ON "business_change_requests"("businessId", "status");
CREATE INDEX "business_change_requests_submitterUserId_idx" ON "business_change_requests"("submitterUserId");
CREATE INDEX "business_change_requests_reviewedById_idx" ON "business_change_requests"("reviewedById");
CREATE INDEX "business_change_requests_retentionReviewAt_idx" ON "business_change_requests"("retentionReviewAt");

ALTER TABLE "businesses" ADD CONSTRAINT "businesses_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "business_change_requests" ADD CONSTRAINT "business_change_requests_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_change_requests" ADD CONSTRAINT "business_change_requests_submitterUserId_fkey" FOREIGN KEY ("submitterUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "business_change_requests" ADD CONSTRAINT "business_change_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "business_claims"
SET "retentionReviewAt" = "createdAt" + INTERVAL '180 days'
WHERE "status" = 'REJECTED' AND "retentionReviewAt" IS NULL;

UPDATE "business_claims"
SET "retentionReviewAt" = "createdAt" + INTERVAL '90 days'
WHERE "status" = 'CANCELLED' AND "retentionReviewAt" IS NULL;

COMMIT;
