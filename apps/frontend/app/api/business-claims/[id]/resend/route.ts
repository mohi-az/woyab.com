import { NextResponse } from "next/server";
import { claimResendDecision } from "@fargo/shared";
import { currentUserId } from "@/lib/auth-user";
import {
  claimOtpMaxSendsPerWindow,
  claimOtpResendCooldownMs,
  claimOtpWindowMs,
  createClaimOtp,
  hashClaimOtp,
  sendBusinessClaimOtp,
} from "@/lib/business-claims";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  const userId = await currentUserId();
  if (!userId) return respond("AUTH_REQUIRED", "Sign in required.", 401);
  const { id } = await context.params;
  const claim = await prisma.businessClaim.findFirst({
    where: { id, claimantUserId: userId },
    include: { business: { select: { businessName: true, ownerId: true, removedAt: true } } },
  });
  if (!claim) return respond("CLAIM_NOT_FOUND", "Claim not found.", 404);
  if (!claim.officialBusinessEmail) return respond("EMAIL_DELIVERY_FAILED", "No business email is attached to this claim.", 409);
  if (!['PENDING_VERIFICATION', 'EXPIRED'].includes(claim.status)) return respond("CLAIM_NOT_PENDING", "This claim cannot receive another code.", 409);
  if (claim.business.removedAt) return respond("BUSINESS_REMOVED", "This business is not publicly available.", 409);
  if (claim.business.ownerId) return respond("BUSINESS_ALREADY_OWNED", "This business already has a verified owner.", 409);

  const now = new Date();
  if (claim.otpBlockedUntil && claim.otpBlockedUntil > now) return respond("OTP_BLOCKED", "Try again after the block ends.", 429, { blockedUntil: claim.otpBlockedUntil });
  const inWindow = Boolean(claim.otpWindowStartedAt && now.getTime() - claim.otpWindowStartedAt.getTime() < claimOtpWindowMs);
  const sendCount = inWindow ? claim.otpSendCount : 0;
  const resendDecision = claimResendDecision({ nowMs: now.getTime(), sentAtMs: claim.otpSentAt?.getTime(), windowStartedAtMs: claim.otpWindowStartedAt?.getTime(), sendCount: claim.otpSendCount, cooldownMs: claimOtpResendCooldownMs, windowMs: claimOtpWindowMs, maxSends: claimOtpMaxSendsPerWindow });
  if (resendDecision === "COOLDOWN") return respond("OTP_BLOCKED", "Wait 60 seconds before requesting another code.", 429);
  if (resendDecision === "LIMIT") return respond("OTP_BLOCKED", "Too many codes requested. Try again later.", 429);

  const generated = createClaimOtp();
  const expiresAt = generated.expiresAt;
  const hash = hashClaimOtp(id, generated.code);
  const updated = await prisma.businessClaim.updateMany({
    where: { id, status: { in: ["PENDING_VERIFICATION", "EXPIRED"] }, otpSentAt: claim.otpSentAt },
    data: {
      status: "PENDING_VERIFICATION",
      otpHash: hash,
      otpExpiresAt: expiresAt,
      otpAttempts: 0,
      otpBlockedUntil: null,
      otpSentAt: now,
      otpSendCount: sendCount + 1,
      otpWindowStartedAt: inWindow ? claim.otpWindowStartedAt : now,
    },
  });
  if (!updated.count) return respond("OTP_BLOCKED", "Another code was already requested. Wait 60 seconds.", 429);

  try {
    await sendBusinessClaimOtp({ to: claim.officialBusinessEmail, businessName: claim.business.businessName, claimantName: claim.claimantName, code: generated.code });
  } catch {
    return respond("EMAIL_DELIVERY_FAILED", "The verification email could not be sent.", 502);
  }
  return NextResponse.json({ success: true, data: { expiresAt: expiresAt.toISOString() } });
}

function respond(code: string, error: string, status: number, details?: unknown) {
  return NextResponse.json({ success: false, code, error, details }, { status });
}
