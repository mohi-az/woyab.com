CREATE TYPE "directory_report_reason" AS ENUM (
  'SPAM',
  'FAKE_OR_MANIPULATED',
  'WRONG_BUSINESS',
  'ILLEGAL_CONTENT',
  'PERSONAL_DATA',
  'HATE_OR_HARASSMENT',
  'COPYRIGHT',
  'OTHER'
);

ALTER TABLE "directory_reports"
  ADD COLUMN "reporterName" TEXT,
  ADD COLUMN "reporterEmail" TEXT,
  ADD COLUMN "reasonCode" "directory_report_reason" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "targetUrl" TEXT,
  ADD COLUMN "targetSnapshot" JSONB,
  ADD COLUMN "moderatorNote" TEXT,
  ADD COLUMN "decisionReason" TEXT,
  ADD COLUMN "actionTaken" TEXT,
  ADD COLUMN "notifiedAt" TIMESTAMP(3);

ALTER TABLE "directory_reports"
  ADD CONSTRAINT "directory_reports_single_target_chk"
  CHECK (
    "businessId" IS NULL
    OR
    "reviewId" IS NULL
  );

CREATE INDEX "directory_reports_reasonCode_idx" ON "directory_reports"("reasonCode");
CREATE INDEX "directory_reports_createdAt_idx" ON "directory_reports"("createdAt");
