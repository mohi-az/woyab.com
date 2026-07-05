CREATE TABLE "review_owner_replies" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "ownerId" TEXT,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "review_owner_replies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_view_daily" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "day" TIMESTAMP(3) NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "business_view_daily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "review_owner_replies_reviewId_key" ON "review_owner_replies"("reviewId");
CREATE INDEX "review_owner_replies_ownerId_idx" ON "review_owner_replies"("ownerId");

CREATE UNIQUE INDEX "business_view_daily_businessId_day_key" ON "business_view_daily"("businessId", "day");
CREATE INDEX "business_view_daily_day_idx" ON "business_view_daily"("day");

ALTER TABLE "review_owner_replies" ADD CONSTRAINT "review_owner_replies_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_owner_replies" ADD CONSTRAINT "review_owner_replies_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "business_view_daily" ADD CONSTRAINT "business_view_daily_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
