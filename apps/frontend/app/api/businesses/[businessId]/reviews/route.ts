import { NextResponse } from "next/server";
import { z } from "zod";
import { shouldShowBusinessRatings } from "@woyab/shared";
import { currentUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { isPersistentlyRateLimited } from "@/lib/persistent-rate-limit";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(200).optional(),
  comment: z.string().trim().min(3).max(2000),
  sourceLocale: z.enum(["de", "en", "fa"]).optional(),
});

export async function POST(request: Request, context: RouteContext) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isPersistentlyRateLimited("create-review", userId, 10, 24 * 60 * 60_000)) {
    return NextResponse.json({ error: "Too many review requests." }, { status: 429 });
  }
  const { businessId } = await context.params;
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the review fields." }, { status: 400 });

  const business = await prisma.business.findFirst({
    where: { id: businessId, removedAt: null, status: "ACTIVE" },
    select: {
      id: true,
      category: { select: { slug: true } },
      subCategory: { select: { slug: true } },
    },
  });
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });
  if (!shouldShowBusinessRatings(business.category.slug, business.subCategory?.slug)) {
    return NextResponse.json({ error: "Ratings are not available for this business category." }, { status: 403 });
  }
  const existing = await prisma.review.findUnique({ where: { businessId_userId: { businessId, userId } } });
  if (existing) return NextResponse.json({ error: "You have already reviewed this business." }, { status: 409 });

  const { sourceLocale, ...reviewData } = parsed.data;
  const review = await prisma.review.create({
    data: {
      businessId,
      userId,
      status: "PENDING",
      sourceLanguageCode: sourceLocale ?? null,
      ...reviewData,
    },
  });
  return NextResponse.json(
    { success: true, message: "Thank you. Your review will be published after review and approval.", data: review },
    { status: 201 },
  );
}
