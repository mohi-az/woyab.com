import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/auth-user";
import { isPersistentlyRateLimited } from "@/lib/persistent-rate-limit";
import { prisma } from "@/lib/prisma";
import { recalculatePublicBusinessRating } from "@/lib/review-rating";

type RouteContext = {
  params: Promise<{ reviewId: string }>;
};

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(200).nullable().optional(),
  comment: z.string().trim().min(3).max(2000),
});

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isPersistentlyRateLimited("update-review", userId, 20, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many review updates." }, { status: 429 });
  }

  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the review fields." }, { status: 400 });
  }

  const { reviewId } = await context.params;
  const existing = await prisma.review.findFirst({
    where: { id: reviewId, userId },
    select: { id: true, businessId: true },
  });
  if (!existing) return NextResponse.json({ error: "Review not found." }, { status: 404 });

  const review = await prisma.$transaction(async (tx) => {
    await tx.reviewHelpfulVote.deleteMany({ where: { reviewId } });
    const updated = await tx.review.update({
      where: { id: reviewId },
      data: {
        rating: parsed.data.rating,
        title: parsed.data.title || null,
        comment: parsed.data.comment,
        status: "PENDING",
        verified: false,
        helpfulCount: 0,
      },
    });
    await recalculatePublicBusinessRating(tx, existing.businessId);
    return updated;
  });

  return NextResponse.json({
    success: true,
    message: "Your changes were saved and sent for moderation.",
    data: review,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isPersistentlyRateLimited("delete-review", userId, 10, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many review deletion attempts." }, { status: 429 });
  }

  const { reviewId } = await context.params;
  const existing = await prisma.review.findFirst({
    where: { id: reviewId, userId },
    select: { id: true, businessId: true },
  });
  if (!existing) return NextResponse.json({ error: "Review not found." }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: reviewId } });
    await recalculatePublicBusinessRating(tx, existing.businessId);
  });

  return NextResponse.json({ success: true });
}
