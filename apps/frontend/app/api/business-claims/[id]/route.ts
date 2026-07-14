import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth-user";
import { claimRetentionDate } from "@/lib/business-claims";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ success: false, code: "AUTH_REQUIRED", error: "Sign in required." }, { status: 401 });
  const { id } = await context.params;
  const claim = await prisma.businessClaim.findFirst({
    where: { id, claimantUserId: userId },
    select: { id: true, status: true, otpExpiresAt: true, otpBlockedUntil: true, officialBusinessEmail: true, business: { select: { businessName: true, slug: true } } },
  });
  if (!claim) return NextResponse.json({ success: false, error: "Claim not found." }, { status: 404 });

  if (claim.status === "PENDING_VERIFICATION" && claim.otpExpiresAt && claim.otpExpiresAt <= new Date()) {
    await prisma.businessClaim.update({
      where: { id },
      data: { status: "EXPIRED", otpHash: null, otpExpiresAt: null, retentionReviewAt: claimRetentionDate(90) },
    });
    return NextResponse.json({ success: true, data: { ...claim, status: "EXPIRED", otpExpiresAt: null } });
  }

  return NextResponse.json({ success: true, data: claim });
}
