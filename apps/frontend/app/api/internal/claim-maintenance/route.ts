import { NextResponse } from "next/server";
import { claimRetentionDate } from "@/lib/business-claims";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const [expired, cleared, verificationTokens, rateLimits] = await prisma.$transaction([
    prisma.businessClaim.updateMany({
      where: { status: "PENDING_VERIFICATION", otpExpiresAt: { lte: now } },
      data: { status: "EXPIRED", otpHash: null, otpExpiresAt: null, otpBlockedUntil: null, retentionReviewAt: claimRetentionDate(90) },
    }),
    prisma.businessClaim.updateMany({
      where: { status: { not: "PENDING_VERIFICATION" }, otpHash: { not: null } },
      data: { otpHash: null, otpExpiresAt: null, otpBlockedUntil: null },
    }),
    prisma.emailVerificationToken.deleteMany({
      where: { OR: [{ expiresAt: { lte: now } }, { usedAt: { not: null } }] },
    }),
    prisma.securityRateLimit.deleteMany({ where: { expiresAt: { lte: now } } }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      expired: expired.count,
      cleared: cleared.count,
      verificationTokens: verificationTokens.count,
      rateLimits: rateLimits.count,
    },
  });
}
