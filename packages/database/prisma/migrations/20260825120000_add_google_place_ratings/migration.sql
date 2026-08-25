-- Keep Google Places aggregate ratings separate from WoYab's own reviews.
ALTER TABLE "businesses"
  ADD COLUMN "googleRating" DOUBLE PRECISION,
  ADD COLUMN "googleUserRatingCount" INTEGER,
  ADD COLUMN "googleRatingUpdatedAt" TIMESTAMP(3);
