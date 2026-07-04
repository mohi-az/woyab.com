import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const reportSchema = z.object({
  businessId: z.string().min(1).optional(),
  reviewId: z.string().min(1).optional(),
  reason: z.string().trim().min(2).max(120),
  message: z.string().trim().max(2000).optional(),
}).refine((data) => data.businessId || data.reviewId, "A business or review target is required.");

export async function POST(request: NextRequest) {
  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Please check the report fields." }, { status: 400 });

  const reporterUserId = await currentUserId();
  const report = await prisma.directoryReport.create({
    data: {
      businessId: parsed.data.businessId,
      reviewId: parsed.data.reviewId,
      reporterUserId,
      reason: parsed.data.reason,
      message: parsed.data.message,
    },
  });

  return NextResponse.json({ success: true, data: { id: report.id } }, { status: 201 });
}
