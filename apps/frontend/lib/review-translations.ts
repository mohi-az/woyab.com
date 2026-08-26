import "server-only";

import { createHash } from "node:crypto";
import type { ContentLocale, Prisma } from "@woyab/database";
import { prisma } from "@/lib/prisma";
import { translateGoogleValues } from "@/lib/google-cloud-translation";

const TRANSLATION_LEASE_MS = 60_000;
const MAX_ATTEMPTS = 5;
const RETRY_DELAYS_MS = [5 * 60_000, 30 * 60_000, 6 * 60 * 60_000, 24 * 60 * 60_000];
const CONTENT_LOCALES = ["DE", "EN", "FA"] as const satisfies readonly ContentLocale[];

type TranslationResult = {
  target: ContentLocale;
  sourceLanguageCode: string | null;
  values: string[];
};

function sanitizedError(error: unknown) {
  const message = error instanceof Error ? error.message : "Translation failed.";
  return message.replace(/key=[^&\s]+/gi, "key=[redacted]").slice(0, 500);
}

function normalizedLanguageCode(value: string | null | undefined) {
  return value?.trim().toLowerCase().split(/[-_]/)[0] || null;
}

function sourceLocale(value: string | null | undefined): ContentLocale | null {
  const normalized = normalizedLanguageCode(value)?.toUpperCase();
  return CONTENT_LOCALES.includes(normalized as ContentLocale) ? normalized as ContentLocale : null;
}

function retryAt(attemptCount: number) {
  if (attemptCount >= MAX_ATTEMPTS) return null;
  const delay = RETRY_DELAYS_MS[Math.max(0, attemptCount - 1)] ?? RETRY_DELAYS_MS.at(-1)!;
  return new Date(Date.now() + delay);
}

export function reviewTranslationHash(title: string | null | undefined, comment: string | null | undefined) {
  return createHash("sha256").update(`${title ?? ""}\u0000${comment ?? ""}`, "utf8").digest("hex");
}

export function ownerReplyTranslationHash(content: string) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

async function translateValues(values: string[], target: ContentLocale): Promise<TranslationResult> {
  const result = await translateGoogleValues({ values, target });
  return { target, sourceLanguageCode: normalizedLanguageCode(result.sourceLanguageCode), values: result.values };
}

async function translateForSupportedLocales(values: string[], sourceHint?: string | null) {
  const hintedSource = sourceLocale(sourceHint);
  const firstTarget = hintedSource === "EN" ? "DE" : "EN";
  const first = await translateValues(values, firstTarget);
  const detectedCode = first.sourceLanguageCode ?? normalizedLanguageCode(sourceHint);
  const detectedLocale = sourceLocale(detectedCode);
  const targets = CONTENT_LOCALES.filter((locale) => locale !== detectedLocale);
  const results: TranslationResult[] = [];
  const errors: string[] = [];

  if (firstTarget !== detectedLocale) results.push(first);
  const remaining = targets.filter((target) => target !== firstTarget);
  const settled = await Promise.allSettled(remaining.map((target) => translateValues(values, target)));
  settled.forEach((result) => {
    if (result.status === "fulfilled") results.push(result.value);
    else errors.push(sanitizedError(result.reason));
  });

  return { detectedCode, targets, results, errors };
}

async function failReviewTranslation(reviewId: string, attemptCount: number, error: unknown) {
  const existingCount = await prisma.reviewTranslation.count({ where: { reviewId } });
  await prisma.review.update({
    where: { id: reviewId },
    data: {
      translationStatus: existingCount ? "PARTIAL" : "FAILED",
      translationError: sanitizedError(error),
      translationNextRetryAt: retryAt(attemptCount),
      translationLeaseExpiresAt: null,
    },
  });
}

export async function processReviewTranslation(reviewId: string, options: { force?: boolean } = {}) {
  const now = new Date();
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      status: true,
      title: true,
      comment: true,
      sourceLanguageCode: true,
      translationStatus: true,
      translationSourceHash: true,
      translationAttemptCount: true,
      translationLeaseExpiresAt: true,
    },
  });
  if (!review || review.status !== "APPROVED" || !review.comment) return false;

  const sourceHash = reviewTranslationHash(review.title, review.comment);
  if (!options.force && review.translationStatus === "READY" && review.translationSourceHash === sourceHash) return true;
  if (!options.force && review.translationAttemptCount >= MAX_ATTEMPTS) return false;
  if (!options.force && review.translationLeaseExpiresAt && review.translationLeaseExpiresAt > now) return false;

  const claimed = await prisma.review.updateMany({
    where: {
      id: review.id,
      status: "APPROVED",
      OR: [{ translationLeaseExpiresAt: null }, { translationLeaseExpiresAt: { lte: now } }],
    },
    data: {
      translationStatus: "PROCESSING",
      translationSourceHash: sourceHash,
      translationAttemptCount: options.force ? 1 : { increment: 1 },
      translationError: null,
      translationNextRetryAt: null,
      translationLeaseExpiresAt: new Date(now.getTime() + TRANSLATION_LEASE_MS),
    },
  });
  if (claimed.count !== 1) return false;
  const attemptCount = options.force ? 1 : review.translationAttemptCount + 1;

  try {
    const values = [review.comment, ...(review.title ? [review.title] : [])];
    const translated = await translateForSupportedLocales(values, review.sourceLanguageCode);
    if (!translated.results.length) throw new Error(translated.errors[0] || "No review translation was returned.");

    await prisma.$transaction(async (tx) => {
      await tx.reviewTranslation.deleteMany({
        where: {
          reviewId,
          OR: [
            { sourceHash: { not: sourceHash } },
            { locale: { notIn: translated.targets } },
          ],
        },
      });
      for (const result of translated.results) {
        await tx.reviewTranslation.upsert({
          where: { reviewId_locale: { reviewId, locale: result.target } },
          create: {
            reviewId,
            locale: result.target,
            comment: result.values[0] ?? review.comment,
            title: review.title ? result.values[1] ?? review.title : null,
            sourceHash,
          },
          update: {
            comment: result.values[0] ?? review.comment,
            title: review.title ? result.values[1] ?? review.title : null,
            sourceHash,
          },
        });
      }
      const readyCount = await tx.reviewTranslation.count({
        where: { reviewId, sourceHash, locale: { in: translated.targets } },
      });
      const ready = readyCount === translated.targets.length;
      await tx.review.update({
        where: { id: reviewId },
        data: {
          sourceLanguageCode: translated.detectedCode,
          translationStatus: ready ? "READY" : "PARTIAL",
          translationError: ready ? null : translated.errors.join(" | ").slice(0, 500) || "Some translations are missing.",
          translationNextRetryAt: ready ? null : retryAt(attemptCount),
          translationLeaseExpiresAt: null,
        },
      });
    });
    return true;
  } catch (error) {
    await failReviewTranslation(reviewId, attemptCount, error);
    return false;
  }
}

async function failOwnerReplyTranslation(ownerReplyId: string, attemptCount: number, error: unknown) {
  const existingCount = await prisma.reviewOwnerReplyTranslation.count({ where: { ownerReplyId } });
  await prisma.reviewOwnerReply.update({
    where: { id: ownerReplyId },
    data: {
      translationStatus: existingCount ? "PARTIAL" : "FAILED",
      translationError: sanitizedError(error),
      translationNextRetryAt: retryAt(attemptCount),
      translationLeaseExpiresAt: null,
    },
  });
}

export async function processOwnerReplyTranslation(ownerReplyId: string, options: { force?: boolean } = {}) {
  const now = new Date();
  const reply = await prisma.reviewOwnerReply.findUnique({
    where: { id: ownerReplyId },
    select: {
      id: true,
      content: true,
      sourceLanguageCode: true,
      translationStatus: true,
      translationSourceHash: true,
      translationAttemptCount: true,
      translationLeaseExpiresAt: true,
      review: { select: { status: true } },
    },
  });
  if (!reply || reply.review.status !== "APPROVED") return false;

  const sourceHash = ownerReplyTranslationHash(reply.content);
  if (!options.force && reply.translationStatus === "READY" && reply.translationSourceHash === sourceHash) return true;
  if (!options.force && reply.translationAttemptCount >= MAX_ATTEMPTS) return false;
  if (!options.force && reply.translationLeaseExpiresAt && reply.translationLeaseExpiresAt > now) return false;

  const claimed = await prisma.reviewOwnerReply.updateMany({
    where: {
      id: reply.id,
      review: { status: "APPROVED" },
      OR: [{ translationLeaseExpiresAt: null }, { translationLeaseExpiresAt: { lte: now } }],
    },
    data: {
      translationStatus: "PROCESSING",
      translationSourceHash: sourceHash,
      translationAttemptCount: options.force ? 1 : { increment: 1 },
      translationError: null,
      translationNextRetryAt: null,
      translationLeaseExpiresAt: new Date(now.getTime() + TRANSLATION_LEASE_MS),
    },
  });
  if (claimed.count !== 1) return false;
  const attemptCount = options.force ? 1 : reply.translationAttemptCount + 1;

  try {
    const translated = await translateForSupportedLocales([reply.content], reply.sourceLanguageCode);
    if (!translated.results.length) throw new Error(translated.errors[0] || "No owner-reply translation was returned.");

    await prisma.$transaction(async (tx) => {
      await tx.reviewOwnerReplyTranslation.deleteMany({
        where: {
          ownerReplyId,
          OR: [
            { sourceHash: { not: sourceHash } },
            { locale: { notIn: translated.targets } },
          ],
        },
      });
      for (const result of translated.results) {
        await tx.reviewOwnerReplyTranslation.upsert({
          where: { ownerReplyId_locale: { ownerReplyId, locale: result.target } },
          create: { ownerReplyId, locale: result.target, content: result.values[0] ?? reply.content, sourceHash },
          update: { content: result.values[0] ?? reply.content, sourceHash },
        });
      }
      const readyCount = await tx.reviewOwnerReplyTranslation.count({
        where: { ownerReplyId, sourceHash, locale: { in: translated.targets } },
      });
      const ready = readyCount === translated.targets.length;
      await tx.reviewOwnerReply.update({
        where: { id: ownerReplyId },
        data: {
          sourceLanguageCode: translated.detectedCode,
          translationStatus: ready ? "READY" : "PARTIAL",
          translationError: ready ? null : translated.errors.join(" | ").slice(0, 500) || "Some translations are missing.",
          translationNextRetryAt: ready ? null : retryAt(attemptCount),
          translationLeaseExpiresAt: null,
        },
      });
    });
    return true;
  } catch (error) {
    await failOwnerReplyTranslation(ownerReplyId, attemptCount, error);
    return false;
  }
}

export async function queueReviewTranslation(
  tx: Prisma.TransactionClient,
  reviewId: string,
  status: "PENDING" | "NOT_REQUESTED",
) {
  await tx.reviewTranslation.deleteMany({ where: { reviewId } });
  await tx.review.update({
    where: { id: reviewId },
    data: {
      translationStatus: status,
      translationSourceHash: null,
      translationAttemptCount: 0,
      translationError: null,
      translationNextRetryAt: null,
      translationLeaseExpiresAt: null,
    },
  });
}

export async function queueOwnerReplyTranslation(
  tx: Prisma.TransactionClient,
  ownerReplyId: string,
  status: "PENDING" | "NOT_REQUESTED",
) {
  await tx.reviewOwnerReplyTranslation.deleteMany({ where: { ownerReplyId } });
  await tx.reviewOwnerReply.update({
    where: { id: ownerReplyId },
    data: {
      translationStatus: status,
      translationSourceHash: null,
      translationAttemptCount: 0,
      translationError: null,
      translationNextRetryAt: null,
      translationLeaseExpiresAt: null,
    },
  });
}

export async function processPendingReviewTranslations(limit = 20) {
  const now = new Date();
  const reviews = await prisma.review.findMany({
    where: {
      status: "APPROVED",
      translationStatus: { in: ["PENDING", "PARTIAL", "FAILED"] },
      translationAttemptCount: { lt: MAX_ATTEMPTS },
      OR: [{ translationNextRetryAt: null }, { translationNextRetryAt: { lte: now } }],
      AND: { OR: [{ translationLeaseExpiresAt: null }, { translationLeaseExpiresAt: { lte: now } }] },
    },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true },
  });
  for (const review of reviews) await processReviewTranslation(review.id);

  const remaining = Math.max(0, limit - reviews.length);
  const replies = remaining ? await prisma.reviewOwnerReply.findMany({
    where: {
      review: { status: "APPROVED" },
      translationStatus: { in: ["PENDING", "PARTIAL", "FAILED"] },
      translationAttemptCount: { lt: MAX_ATTEMPTS },
      OR: [{ translationNextRetryAt: null }, { translationNextRetryAt: { lte: now } }],
      AND: { OR: [{ translationLeaseExpiresAt: null }, { translationLeaseExpiresAt: { lte: now } }] },
    },
    orderBy: { updatedAt: "asc" },
    take: remaining,
    select: { id: true },
  }) : [];
  for (const reply of replies) await processOwnerReplyTranslation(reply.id);

  return { reviews: reviews.length, ownerReplies: replies.length };
}

export async function retryReviewTranslation(reviewId: string) {
  await prisma.review.update({
    where: { id: reviewId },
    data: {
      translationStatus: "PENDING",
      translationAttemptCount: 0,
      translationError: null,
      translationNextRetryAt: null,
      translationLeaseExpiresAt: null,
    },
  });
  return processReviewTranslation(reviewId, { force: true });
}

export async function retryOwnerReplyTranslation(ownerReplyId: string) {
  await prisma.reviewOwnerReply.update({
    where: { id: ownerReplyId },
    data: {
      translationStatus: "PENDING",
      translationAttemptCount: 0,
      translationError: null,
      translationNextRetryAt: null,
      translationLeaseExpiresAt: null,
    },
  });
  return processOwnerReplyTranslation(ownerReplyId, { force: true });
}
