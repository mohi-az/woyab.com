CREATE TYPE "contact_message_email_status" AS ENUM ('PENDING', 'SENT', 'FAILED', 'NOT_CONFIGURED');

ALTER TABLE "contact_messages"
  ADD COLUMN "emailStatus" "contact_message_email_status" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "ownerViewedAt" TIMESTAMP(3),
  ADD COLUMN "emailError" TEXT;

UPDATE "contact_messages"
SET "emailStatus" = CASE
  WHEN "deliveryMode" = 'resend' THEN 'SENT'::"contact_message_email_status"
  WHEN "deliveryMode" = 'mock' THEN 'NOT_CONFIGURED'::"contact_message_email_status"
  ELSE 'PENDING'::"contact_message_email_status"
END;

CREATE INDEX "contact_messages_emailStatus_idx" ON "contact_messages"("emailStatus");
