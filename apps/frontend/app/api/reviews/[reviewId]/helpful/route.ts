import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth-user";
import { isPersistentlyRateLimited } from "@/lib/persistent-rate-limit";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ reviewId: string }>;
};

async function authorizeVote(reviewId: string, userId: string) {
  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      status: "APPROVED",
      business: { removedAt: null, status: "ACTIVE" },
    },
    select: { id: true, userId: true, helpfulCount: true },
  });
  if (!review) return { error: "Review not found.", status: 404 } as const;
  if (review.userId === userId) {
    return { error: "You cannot vote for your own review.", status: 400 } as const;
  }
  return { review } as const;
}

export async function POST(_request: Request, context: RouteContext) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isPersistentlyRateLimited("review-helpful", userId, 100, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many helpful votes." }, { status: 429 });
  }

  const { reviewId } = await context.params;
  const authorization = await authorizeVote(reviewId, userId);
  if ("error" in authorization) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }

  const result = await prisma.$transaction(async (tx) => {
    const inserted = await tx.reviewHelpfulVote.createMany({
      data: [{ reviewId, userId }],
      skipDuplicates: true,
    });
    const review = inserted.count
      ? await tx.review.update({
          where: { id: reviewId },
          data: { helpfulCount: { increment: 1 } },
          select: { helpfulCount: true },
        })
      : await tx.review.findUniqueOrThrow({
          where: { id: reviewId },
          select: { helpfulCount: true },
        });
    return review.helpfulCount;
  });

  return NextResponse.json({ success: true, data: { voted: true, helpfulCount: result } });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isPersistentlyRateLimited("review-helpful", userId, 100, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many helpful votes." }, { status: 429 });
  }

  const { reviewId } = await context.params;
  const authorization = await authorizeVote(reviewId, userId);
  if ("error" in authorization) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }

  const result = await prisma.$transaction(async (tx) => {
    const deleted = await tx.reviewHelpfulVote.deleteMany({ where: { reviewId, userId } });
    if (deleted.count) {
      await tx.review.updateMany({
        where: { id: reviewId, helpfulCount: { gt: 0 } },
        data: { helpfulCount: { decrement: 1 } },
      });
    }
    const review = await tx.review.findUniqueOrThrow({
      where: { id: reviewId },
      select: { helpfulCount: true },
    });
    return review.helpfulCount;
  });

  return NextResponse.json({ success: true, data: { voted: false, helpfulCount: result } });
}
