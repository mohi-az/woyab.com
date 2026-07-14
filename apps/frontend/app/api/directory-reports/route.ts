import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isRateLimited, requestIp } from "@/lib/rate-limit";

const reasonLabels = {
  SPAM: "Spam or advertising",
  FAKE_OR_MANIPULATED: "Fake or manipulated content",
  WRONG_BUSINESS: "Wrong business or misplaced content",
  ILLEGAL_CONTENT: "Illegal content",
  PERSONAL_DATA: "Personal or confidential data",
  HATE_OR_HARASSMENT: "Hate, harassment, or threats",
  COPYRIGHT: "Copyright or intellectual property",
  OTHER: "Other",
} as const;

const reportSchema = z.object({
  businessId: z.string().min(1).optional(),
  reviewId: z.string().min(1).optional(),
  reasonCode: z.enum([
    "SPAM",
    "FAKE_OR_MANIPULATED",
    "WRONG_BUSINESS",
    "ILLEGAL_CONTENT",
    "PERSONAL_DATA",
    "HATE_OR_HARASSMENT",
    "COPYRIGHT",
    "OTHER",
  ]).default("OTHER"),
  reason: z.string().trim().max(120).optional(),
  message: z.string().trim().max(2000).optional(),
  reporterName: z.string().trim().max(120).optional(),
  reporterEmail: z.string().trim().email().max(255).optional(),
  targetUrl: z.string().trim().max(800).optional(),
}).refine((data) => Boolean(data.businessId) !== Boolean(data.reviewId), "Choose exactly one report target.");

export async function POST(request: NextRequest) {
  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, errorCode: "INVALID_FIELDS", error: "Please check the report fields." }, { status: 400 });
  }

  const reporterUserId = await currentUserId();
  const ip = requestIp(request);
  const targetId = parsed.data.businessId ?? parsed.data.reviewId;
  const rateKey = reporterUserId ? `report:user:${reporterUserId}` : `report:ip:${ip}`;
  if (isRateLimited(rateKey, 6, 15 * 60_000)) {
    return NextResponse.json({ success: false, errorCode: "RATE_LIMITED", error: "Too many reports. Please try again later." }, { status: 429 });
  }

  if (!reporterUserId && !parsed.data.reporterEmail) {
    return NextResponse.json({ success: false, errorCode: "EMAIL_REQUIRED", error: "Please enter an email address so we can process the report." }, { status: 400 });
  }

  const target = parsed.data.businessId
    ? await prisma.business.findFirst({
        where: { id: parsed.data.businessId, removedAt: null },
        select: {
          id: true,
          slug: true,
          businessName: true,
          status: true,
          ownerId: true,
        },
      })
    : await prisma.review.findFirst({
        where: { id: parsed.data.reviewId, business: { removedAt: null } },
        select: {
          id: true,
          rating: true,
          title: true,
          comment: true,
          status: true,
          userId: true,
          business: { select: { id: true, slug: true, businessName: true } },
        },
      });

  if (!target) {
    return NextResponse.json({ success: false, errorCode: "TARGET_NOT_FOUND", error: "The reported item could not be found." }, { status: 404 });
  }

  const duplicate = await prisma.directoryReport.findFirst({
    where: {
      businessId: parsed.data.businessId,
      reviewId: parsed.data.reviewId,
      status: { in: ["OPEN", "REVIEWING"] },
      OR: reporterUserId
        ? [{ reporterUserId }]
        : parsed.data.reporterEmail
          ? [{ reporterEmail: parsed.data.reporterEmail }]
          : [],
    },
    select: { id: true },
  });

  if (duplicate) {
    return NextResponse.json({ success: false, errorCode: "DUPLICATE_OPEN_REPORT", error: "You already have an open report for this item." }, { status: 409 });
  }

  const reason = parsed.data.reason?.trim() || reasonLabels[parsed.data.reasonCode];
  const report = await prisma.directoryReport.create({
    data: {
      businessId: parsed.data.businessId,
      reviewId: parsed.data.reviewId,
      reporterUserId,
      reporterName: parsed.data.reporterName,
      reporterEmail: parsed.data.reporterEmail,
      reasonCode: parsed.data.reasonCode,
      reason,
      message: parsed.data.message,
      targetUrl: parsed.data.targetUrl,
      targetSnapshot: {
        targetType: parsed.data.businessId ? "business" : "review",
        targetId,
        capturedAt: new Date().toISOString(),
        data: target,
      },
    },
  });

  return NextResponse.json({ success: true, data: { id: report.id } }, { status: 201 });
}
