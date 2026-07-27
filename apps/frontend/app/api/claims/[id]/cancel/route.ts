import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth-user";
import { claimRetentionDate } from "@/lib/business-claims";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

const cancellableStatuses = ["PENDING_VERIFICATION", "UNDER_REVIEW"] as const;

export async function POST(_request: Request, context: Context) {
  const userId = await currentUserId();
  if (!userId) return reply("AUTH_REQUIRED", "Sign in required.", 401);
  const { id } = await context.params;

  const claim = await prisma.businessClaim.findFirst({
    where: { id, claimantUserId: userId },
    select: { id: true, status: true },
  });

  if (!claim) return reply("CLAIM_NOT_FOUND", "Claim not found.", 404);
  if (!cancellableStatuses.includes(claim.status as any)) {
    return reply("CLAIM_NOT_CANCELLABLE", "This claim can no longer be cancelled.", 409);
  }

  await prisma.businessClaim.update({
    where: { id },
    data: {
      status: "CANCELLED",
      otpHash: null,
      otpExpiresAt: null,
      retentionReviewAt: claimRetentionDate(90),
    },
  });

  return NextResponse.json({ success: true, data: { status: "CANCELLED" } });
}

function reply(code: string, error: string, status: number) {
  return NextResponse.json({ success: false, code, error }, { status });
}
