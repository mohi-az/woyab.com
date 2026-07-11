CREATE TABLE "business_analytics_events" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "visitorId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "business_analytics_events_occurredAt_idx" ON "business_analytics_events"("occurredAt");
CREATE INDEX "business_analytics_events_businessId_occurredAt_idx" ON "business_analytics_events"("businessId", "occurredAt");
CREATE INDEX "business_analytics_events_visitorId_occurredAt_idx" ON "business_analytics_events"("visitorId", "occurredAt");
CREATE INDEX "business_analytics_events_sessionId_occurredAt_idx" ON "business_analytics_events"("sessionId", "occurredAt");
ALTER TABLE "business_analytics_events" ADD CONSTRAINT "business_analytics_events_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
