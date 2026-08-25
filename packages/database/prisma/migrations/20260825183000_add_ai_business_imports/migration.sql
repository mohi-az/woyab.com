CREATE TYPE "ai_business_import_status" AS ENUM (
  'QUEUED',
  'FETCHING_GOOGLE',
  'FETCHING_WEBSITE',
  'ANALYZING',
  'READY',
  'FAILED',
  'APPLIED',
  'DISCARDED'
);

CREATE TABLE "ai_business_imports" (
  "id" TEXT NOT NULL,
  "placeId" TEXT NOT NULL,
  "status" "ai_business_import_status" NOT NULL DEFAULT 'QUEUED',
  "provider" "ai_provider" NOT NULL,
  "model" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "appliedBusinessId" TEXT,
  "googleSnapshot" JSONB,
  "websiteEvidence" JSONB,
  "proposal" JSONB,
  "reviewState" JSONB,
  "warnings" JSONB,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "requestId" TEXT,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "totalTokens" INTEGER,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "leaseExpiresAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "appliedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_business_imports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_business_imports_appliedBusinessId_key" ON "ai_business_imports"("appliedBusinessId");
CREATE INDEX "ai_business_imports_createdById_createdAt_idx" ON "ai_business_imports"("createdById", "createdAt");
CREATE INDEX "ai_business_imports_placeId_status_idx" ON "ai_business_imports"("placeId", "status");
CREATE INDEX "ai_business_imports_status_leaseExpiresAt_idx" ON "ai_business_imports"("status", "leaseExpiresAt");
CREATE INDEX "ai_business_imports_expiresAt_idx" ON "ai_business_imports"("expiresAt");

ALTER TABLE "ai_business_imports"
  ADD CONSTRAINT "ai_business_imports_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_business_imports"
  ADD CONSTRAINT "ai_business_imports_appliedBusinessId_fkey"
  FOREIGN KEY ("appliedBusinessId") REFERENCES "businesses"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
