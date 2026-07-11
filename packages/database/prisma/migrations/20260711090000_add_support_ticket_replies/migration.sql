CREATE TABLE "support_ticket_replies" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_ticket_replies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "support_ticket_replies_authorId_idx" ON "support_ticket_replies"("authorId");
CREATE INDEX "support_ticket_replies_ticketId_createdAt_idx" ON "support_ticket_replies"("ticketId", "createdAt");

ALTER TABLE "support_ticket_replies" ADD CONSTRAINT "support_ticket_replies_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_ticket_replies" ADD CONSTRAINT "support_ticket_replies_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
