import { businessClaimVerifySchema, claimVerificationDecision, otpFailureState } from "@fargo/shared";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth-user";
import { claimOtpBlockMs, claimOtpMatches, claimRetentionDate, sendBusinessClaimApprovedEmail, sendBusinessClaimUnderReviewEmail, sendBusinessClaimWarningEmailToCurrentOwner } from "@/lib/business-claims";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const userId = await currentUserId();
  if (!userId) return reply("AUTH_REQUIRED", "Sign in required.", 401);
  const parsed = businessClaimVerifySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reply("OTP_INVALID", "Enter a six-digit code.", 400);
  const { id } = await context.params;
  const now = new Date();
  
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "fa";

  const claim = await prisma.businessClaim.findFirst({
    where: { id, claimantUserId: userId },
    include: {
      business: {
        select: {
          id: true,
          businessName: true,
          ownerId: true,
          email: true,
          website: true,
          removedAt: true,
          status: true,
          owner: { select: { email: true } },
        },
      },
    },
  });
  if (!claim) return reply("CLAIM_NOT_FOUND", "Claim not found.", 404);
  if (claim.status !== "PENDING_VERIFICATION") return reply("CLAIM_NOT_PENDING", "This claim is no longer awaiting a code.", 409, { status: claim.status });
  if (claim.business.removedAt) return reply("BUSINESS_REMOVED", "This business is not publicly available.", 409);
  if (claim.business.status !== "ACTIVE") return reply("BUSINESS_REMOVED", "This business is not publicly available.", 409);
  if (claim.otpBlockedUntil && claim.otpBlockedUntil > now) return reply("OTP_BLOCKED", "Too many attempts. Try again after the block ends.", 429, { blockedUntil: claim.otpBlockedUntil });
  if (claim.otpBlockedUntil && claim.otpBlockedUntil <= now) {
    await prisma.businessClaim.updateMany({ where: { id, status: "PENDING_VERIFICATION" }, data: { otpAttempts: 0, otpBlockedUntil: null } });
    claim.otpAttempts = 0;
    claim.otpBlockedUntil = null;
  }
  if (!claim.otpHash || !claim.otpExpiresAt || claim.otpExpiresAt <= now) {
    await prisma.businessClaim.update({ where: { id }, data: { status: "EXPIRED", otpHash: null, otpExpiresAt: null, retentionReviewAt: claimRetentionDate(90) } });
    return reply("OTP_EXPIRED", "The verification code has expired.", 410);
  }

  if (!claimOtpMatches(claim.otpHash, id, parsed.data.code)) {
    const updated = await prisma.businessClaim.updateMany({
      where: { id, claimantUserId: userId, status: "PENDING_VERIFICATION", otpHash: claim.otpHash },
      data: { otpAttempts: { increment: 1 } },
    });
    if (!updated.count) return reply("CLAIM_NOT_PENDING", "This claim is no longer awaiting a code.", 409);
    const attempts = (await prisma.businessClaim.findUnique({ where: { id }, select: { otpAttempts: true } }))?.otpAttempts ?? 3;
    const failure = otpFailureState(attempts, Date.now(), claimOtpBlockMs);
    const blockedUntil = failure.blockedUntil;
    if (blockedUntil) await prisma.businessClaim.updateMany({ where: { id, status: "PENDING_VERIFICATION" }, data: { otpBlockedUntil: blockedUntil } });
    return reply(blockedUntil ? "OTP_BLOCKED" : "OTP_INVALID", blockedUntil ? "Too many attempts. Try again in 10 minutes." : "The verification code is incorrect.", blockedUntil ? 429 : 400, { attemptsRemaining: failure.attemptsRemaining, blockedUntil });
  }

  const emailMatches = Boolean(claim.business.email && claim.officialBusinessEmail && claim.business.email.trim().toLowerCase() === claim.officialBusinessEmail.trim().toLowerCase());
  const decision = claimVerificationDecision({ emailMatchesListing: emailMatches, officialBusinessEmail: claim.officialBusinessEmail || "", hasOwner: Boolean(claim.business.ownerId), businessWebsite: claim.business.website });
  const result = await prisma.$transaction(async (tx) => {
    const transitioned = await tx.businessClaim.updateMany({
      where: { id, claimantUserId: userId, status: "PENDING_VERIFICATION", otpHash: claim.otpHash },
      data: { status: "UNDER_REVIEW", verifiedAt: now, verificationMethod: "EMAIL_OTP", otpHash: null, otpExpiresAt: null, otpBlockedUntil: null },
    });
    if (!transitioned.count) {
      const current = await tx.businessClaim.findUnique({ where: { id }, select: { status: true } });
      return { status: current?.status === "APPROVED" ? "APPROVED" as const : "UNDER_REVIEW" as const };
    }
    await tx.adminAuditLog.create({ data: { actorId: userId, action: "claim.email_verified", entityType: "BusinessClaim", entityId: id, metadata: { businessId: claim.businessId, decision } } });

    if (decision === "APPROVED") {
      const attached = await tx.business.updateMany({
        where: { id: claim.businessId, ownerId: null, removedAt: null, status: "ACTIVE" },
        data: { ownerId: userId, verified: true },
      });
      if (attached.count) {
        await tx.user.update({ where: { id: userId }, data: { role: "OWNER", authVersion: { increment: 1 } } });
        await tx.businessClaim.update({ where: { id }, data: { status: "APPROVED", reviewedAt: now } });
        await tx.adminAuditLog.create({ data: { actorId: userId, action: "claim.auto_approved", entityType: "BusinessClaim", entityId: id, metadata: { businessId: claim.businessId, verificationMethod: "EMAIL_OTP" } } });
        return { status: "APPROVED" as const };
      }
    }
    return { status: "UNDER_REVIEW" as const };
  });

  if (result.status === "APPROVED") {
    try {
      await sendBusinessClaimApprovedEmail({
        to: claim.claimantEmail,
        businessName: claim.business.businessName,
        claimantName: claim.claimantName,
        locale,
      });
    } catch {
      // Email delivery error should not block successful DB transaction
    }
  } else if (result.status === "UNDER_REVIEW") {
    try {
      await sendBusinessClaimUnderReviewEmail({
        to: claim.claimantEmail,
        businessName: claim.business.businessName,
        claimantName: claim.claimantName,
        officialBusinessEmail: claim.officialBusinessEmail || claim.claimantEmail,
        locale,
      });
    } catch {
      // Email delivery error should not block successful DB transaction
    }

    if (claim.business.owner?.email) {
      try {
        await sendBusinessClaimWarningEmailToCurrentOwner({
          to: claim.business.owner.email,
          businessName: claim.business.businessName,
          claimantName: claim.claimantName,
          locale,
        });
      } catch {
        // Warning email delivery error should not block transaction
      }
    }
  }

  return NextResponse.json({ success: true, code: result.status === "UNDER_REVIEW" ? "OWNER_REVIEW_REQUIRED" : undefined, data: result });
}

function reply(code: string, error: string, status: number, details?: unknown) {
  return NextResponse.json({ success: false, code, error, details }, { status });
}
