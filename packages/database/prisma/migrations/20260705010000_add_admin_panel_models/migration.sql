CREATE TYPE "directory_report_status" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');
CREATE TYPE "business_claim_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "contact_message_status" AS ENUM ('NEW', 'READ', 'ARCHIVED');
CREATE TYPE "support_ticket_status" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'CLOSED');
CREATE TYPE "support_ticket_priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

CREATE TABLE "admin_audit_logs" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "directory_reports" (
  "id" TEXT NOT NULL,
  "businessId" TEXT,
  "reviewId" TEXT,
  "reporterUserId" TEXT,
  "reason" TEXT NOT NULL,
  "message" TEXT,
  "status" "directory_report_status" NOT NULL DEFAULT 'OPEN',
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "directory_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_claims" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "claimantUserId" TEXT,
  "claimantName" TEXT NOT NULL,
  "claimantEmail" TEXT NOT NULL,
  "claimantPhone" TEXT,
  "message" TEXT,
  "status" "business_claim_status" NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "business_claims_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contact_messages" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "message" TEXT NOT NULL,
  "status" "contact_message_status" NOT NULL DEFAULT 'NEW',
  "deliveryMode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_tickets" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "support_ticket_status" NOT NULL DEFAULT 'OPEN',
  "priority" "support_ticket_priority" NOT NULL DEFAULT 'NORMAL',
  "assignedToId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_settings" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "admin_audit_logs_actorId_idx" ON "admin_audit_logs"("actorId");
CREATE INDEX "admin_audit_logs_entityType_entityId_idx" ON "admin_audit_logs"("entityType", "entityId");
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt");

CREATE INDEX "directory_reports_businessId_idx" ON "directory_reports"("businessId");
CREATE INDEX "directory_reports_reviewId_idx" ON "directory_reports"("reviewId");
CREATE INDEX "directory_reports_reporterUserId_idx" ON "directory_reports"("reporterUserId");
CREATE INDEX "directory_reports_status_idx" ON "directory_reports"("status");

CREATE INDEX "business_claims_businessId_idx" ON "business_claims"("businessId");
CREATE INDEX "business_claims_claimantUserId_idx" ON "business_claims"("claimantUserId");
CREATE INDEX "business_claims_status_idx" ON "business_claims"("status");

CREATE INDEX "contact_messages_businessId_idx" ON "contact_messages"("businessId");
CREATE INDEX "contact_messages_status_idx" ON "contact_messages"("status");

CREATE INDEX "support_tickets_userId_idx" ON "support_tickets"("userId");
CREATE INDEX "support_tickets_assignedToId_idx" ON "support_tickets"("assignedToId");
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

CREATE INDEX "admin_settings_updatedById_idx" ON "admin_settings"("updatedById");

ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "directory_reports" ADD CONSTRAINT "directory_reports_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "directory_reports" ADD CONSTRAINT "directory_reports_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "directory_reports" ADD CONSTRAINT "directory_reports_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "directory_reports" ADD CONSTRAINT "directory_reports_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "business_claims" ADD CONSTRAINT "business_claims_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_claims" ADD CONSTRAINT "business_claims_claimantUserId_fkey" FOREIGN KEY ("claimantUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "business_claims" ADD CONSTRAINT "business_claims_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
