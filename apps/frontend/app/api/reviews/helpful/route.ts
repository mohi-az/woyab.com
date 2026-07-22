import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

const MAX_REVIEW_IDS = 50;

export async function GET(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ data: { reviewIds: [] } });

  const reviewIds = [...new Set(
    request.nextUrl.searchParams
      .getAll("id")
      .map((id) => id.trim())
      .filter(Boolean),
  )].slice(0, MAX_REVIEW_IDS);

  if (!reviewIds.length) return NextResponse.json({ data: { reviewIds: [] } });

  const votes = await prisma.reviewHelpfulVote.findMany({
    where: { userId, reviewId: { in: reviewIds } },
    select: { reviewId: true },
  });

  return NextResponse.json({ data: { reviewIds: votes.map((vote) => vote.reviewId) } });
}
