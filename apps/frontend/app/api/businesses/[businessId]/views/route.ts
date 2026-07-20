import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

const payloadSchema = z.object({
  visitorId: z.string().min(16).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  sessionId: z.string().min(16).max(80).regex(/^[a-zA-Z0-9_-]+$/),
});

export async function POST(request: Request, context: RouteContext) {
  const { businessId } = await context.params;
  const payload = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Invalid analytics payload" }, { status: 400 });
  const business = await prisma.business.findFirst({
    where: { id: businessId, removedAt: null, status: "ACTIVE" },
    select: { id: true },
  });
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.businessAnalyticsEvent.create({ data: { businessId, visitorId: payload.data.visitorId, sessionId: payload.data.sessionId } }),
    prisma.businessViewDaily.upsert({
    where: {
      businessId_day: {
        businessId,
        day: startOfUtcDay(new Date()),
      },
    },
    update: {
      views: { increment: 1 },
    },
    create: {
      businessId,
      day: startOfUtcDay(new Date()),
      views: 1,
    },
    }),
  ]);

  return NextResponse.json({ success: true });
}
