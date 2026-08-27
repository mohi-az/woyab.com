CREATE TYPE "public_contact_subject" AS ENUM ('GENERAL', 'ACCOUNT', 'BUSINESS_OWNERSHIP', 'PARTNERSHIP', 'PRIVACY', 'OTHER');
CREATE TYPE "public_contact_status" AS ENUM ('NEW', 'ARCHIVED');
CREATE TYPE "email_delivery_status" AS ENUM ('PENDING', 'SENT', 'FAILED', 'NOT_CONFIGURED');

CREATE TABLE "public_contact_messages" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "subject" "public_contact_subject" NOT NULL,
  "message" TEXT NOT NULL,
  "status" "public_contact_status" NOT NULL DEFAULT 'NEW',
  "notificationStatus" "email_delivery_status" NOT NULL DEFAULT 'PENDING',
  "notificationError" TEXT,
  "acknowledgementStatus" "email_delivery_status" NOT NULL DEFAULT 'PENDING',
  "acknowledgementError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "public_contact_messages_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public_contact_messages"
  ADD CONSTRAINT "public_contact_messages_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "public_contact_messages_userId_idx" ON "public_contact_messages"("userId");
CREATE INDEX "public_contact_messages_status_createdAt_idx" ON "public_contact_messages"("status", "createdAt");
CREATE INDEX "public_contact_messages_subject_createdAt_idx" ON "public_contact_messages"("subject", "createdAt");
