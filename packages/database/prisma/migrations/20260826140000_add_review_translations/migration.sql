CREATE TYPE "content_translation_status" AS ENUM (
  'NOT_REQUESTED',
  'PENDING',
  'PROCESSING',
  'PARTIAL',
  'READY',
  'FAILED'
);

ALTER TABLE "reviews"
  ADD COLUMN "sourceLanguageCode" TEXT,
  ADD COLUMN "translationStatus" "content_translation_status" NOT NULL DEFAULT 'NOT_REQUESTED',
  ADD COLUMN "translationSourceHash" TEXT,
  ADD COLUMN "translationAttemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "translationError" TEXT,
  ADD COLUMN "translationNextRetryAt" TIMESTAMP(3),
  ADD COLUMN "translationLeaseExpiresAt" TIMESTAMP(3);

ALTER TABLE "review_owner_replies"
  ADD COLUMN "sourceLanguageCode" TEXT,
  ADD COLUMN "translationStatus" "content_translation_status" NOT NULL DEFAULT 'NOT_REQUESTED',
  ADD COLUMN "translationSourceHash" TEXT,
  ADD COLUMN "translationAttemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "translationError" TEXT,
  ADD COLUMN "translationNextRetryAt" TIMESTAMP(3),
  ADD COLUMN "translationLeaseExpiresAt" TIMESTAMP(3);

CREATE TABLE "review_translations" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "locale" "content_locale" NOT NULL,
  "title" TEXT,
  "comment" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'GOOGLE_NMT',
  "sourceHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "review_translations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "review_owner_reply_translations" (
  "id" TEXT NOT NULL,
  "ownerReplyId" TEXT NOT NULL,
  "locale" "content_locale" NOT NULL,
  "content" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'GOOGLE_NMT',
  "sourceHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "review_owner_reply_translations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "review_translations_reviewId_locale_key"
  ON "review_translations"("reviewId", "locale");
CREATE INDEX "review_translations_locale_idx"
  ON "review_translations"("locale");
CREATE UNIQUE INDEX "review_owner_reply_translations_ownerReplyId_locale_key"
  ON "review_owner_reply_translations"("ownerReplyId", "locale");
CREATE INDEX "review_owner_reply_translations_locale_idx"
  ON "review_owner_reply_translations"("locale");
CREATE INDEX "reviews_translationStatus_translationNextRetryAt_idx"
  ON "reviews"("translationStatus", "translationNextRetryAt");
CREATE INDEX "review_owner_replies_translationStatus_translationNextRetryAt_idx"
  ON "review_owner_replies"("translationStatus", "translationNextRetryAt");

ALTER TABLE "review_translations"
  ADD CONSTRAINT "review_translations_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "reviews"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "review_owner_reply_translations"
  ADD CONSTRAINT "review_owner_reply_translations_ownerReplyId_fkey"
  FOREIGN KEY ("ownerReplyId") REFERENCES "review_owner_replies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
