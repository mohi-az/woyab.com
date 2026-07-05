import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export async function POST(_request: Request, context: RouteContext) {
  const { businessId } = await context.params;
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true } });
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  await prisma.businessViewDaily.upsert({
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
  });

  return NextResponse.json({ success: true });
}
