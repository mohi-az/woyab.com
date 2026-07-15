import { businessClaimCreateSchema } from "@fargo/shared";
import { NextResponse } from "next/server";
import {
  claimPrivacyNoticeVersion,
  claimTermsVersion,
  createClaimOtp,
  hasDeliverableEmailDomain,
  sendBusinessClaimOtp,
} from "@/lib/business-claims";
import { currentUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

const activeStatuses = ["PENDING_VERIFICATION", "UNDER_REVIEW"] as const;

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return error("AUTH_REQUIRED", "Sign in before claiming a business.", 401);

  const parsed = businessClaimCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error("INVALID_FIELDS", "Please check the claim fields.", 400, parsed.error.flatten().fieldErrors);

  const [user, business, activeClaim] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, active: true } }),
    prisma.business.findUnique({ where: { id: parsed.data.businessId }, select: { id: true, businessName: true, email: true, ownerId: true, removedAt: true } }),
    prisma.businessClaim.findFirst({
      where: { businessId: parsed.data.businessId, claimantUserId: userId, status: { in: [...activeStatuses] } },
      select: { id: true, status: true },
    }),
  ]);

  if (!user?.active || !user.email) return error("AUTH_REQUIRED", "A valid account email is required.", 401);
  if (!business) return error("BUSINESS_NOT_FOUND", "Business not found.", 404);
  if (business.removedAt) return error("BUSINESS_REMOVED", "This business is not publicly available.", 409);
  if (business.ownerId) return error("BUSINESS_ALREADY_OWNED", "This business already has a verified owner.", 409);
  if (activeClaim) return error("CLAIM_ALREADY_ACTIVE", "You already have an active claim for this business.", 409, { claimId: activeClaim.id, status: activeClaim.status });

  let deliverable = false;
  try {
    deliverable = await hasDeliverableEmailDomain(parsed.data.officialBusinessEmail);
  } catch {
    return error("EMAIL_DOMAIN_UNAVAILABLE", "The email domain could not be checked. Please try again.", 503);
  }
  if (!deliverable) return error("EMAIL_DOMAIN_INVALID", "The business email domain cannot receive email.", 400);

  const now = new Date();
  const otp = createClaimOtp();
  const emailMatchesListing = Boolean(business.email && business.email.trim().toLowerCase() === parsed.data.officialBusinessEmail);

  try {
    await prisma.businessClaim.create({
      data: {
        id: otp.claimId,
        businessId: business.id,
        claimantUserId: user.id,
        claimantName: parsed.data.claimantName,
        claimantEmail: user.email,
        officialBusinessEmail: parsed.data.officialBusinessEmail,
        officialUrl: parsed.data.officialUrl,
        privacyNoticeVersion: claimPrivacyNoticeVersion(),
        privacyNoticeAcceptedAt: now,
        termsVersion: claimTermsVersion(),
        termsAcceptedAt: now,
        otpHash: otp.hash,
        otpExpiresAt: otp.expiresAt,
        otpSentAt: now,
        otpSendCount: 1,
        otpWindowStartedAt: now,
        emailMatchesListing,
        status: "PENDING_VERIFICATION",
      },
    });
  } catch (creationError) {
    if (creationError && typeof creationError === "object" && "code" in creationError && creationError.code === "P2002") {
      return error("CLAIM_ALREADY_ACTIVE", "You already have an active claim for this business.", 409);
    }
    throw creationError;
  }

  try {
    await sendBusinessClaimOtp({
      to: parsed.data.officialBusinessEmail,
      businessName: business.businessName,
      claimantName: parsed.data.claimantName,
      code: otp.code,
    });
  } catch {
    await prisma.businessClaim.update({
      where: { id: otp.claimId },
      data: { status: "CANCELLED", otpHash: null, otpExpiresAt: null, retentionReviewAt: new Date(Date.now() + 90 * 86_400_000) },
    });
    return error("EMAIL_DELIVERY_FAILED", "The verification email could not be sent.", 502);
  }

  return NextResponse.json({ success: true, data: { id: otp.claimId, status: "PENDING_VERIFICATION", expiresAt: otp.expiresAt.toISOString() } }, { status: 201 });
}

function error(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ success: false, code, error: message, details }, { status });
}
