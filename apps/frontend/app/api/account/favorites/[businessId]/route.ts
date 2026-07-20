import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ businessId: string }> };

export async function PUT(_request: Request, { params }: Context) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { businessId } = await params;

  const business = await prisma.business.findFirst({
    where: { id: businessId, removedAt: null, status: "ACTIVE" },
    select: { id: true },
  });
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  await prisma.favorite.upsert({
    where: { userId_businessId: { userId, businessId } },
    create: { userId, businessId },
    update: {},
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: Context) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { businessId } = await params;

  await prisma.favorite.deleteMany({ where: { userId, businessId } });
  return NextResponse.json({ success: true });
}
