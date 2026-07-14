import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ businessId: string }> };

export async function POST(_request: Request, context: Context) {
  const userId = await currentUserId();
  if (!userId) return result("AUTH_REQUIRED", "Sign in required.", 401);
  const { businessId } = await context.params;
  const [business, user] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId }, select: { id: true, slug: true, ownerId: true, removedAt: true, restoredAt: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true, active: true } }),
  ]);
  if (!business) return result("BUSINESS_NOT_FOUND", "Business not found.", 404);
  if (!user?.active || (business.ownerId !== userId && !["ADMIN", "SUPER_ADMIN"].includes(user.role))) return result("FORBIDDEN", "You cannot restore this business.", 403);
  if (!business.removedAt) return NextResponse.json({ success: true, data: { restoredAt: business.restoredAt } });

  const restoredAt = new Date();
  await prisma.$transaction([
    prisma.business.update({ where: { id: businessId }, data: { removedAt: null, removedById: null, restoredAt } }),
    prisma.adminAuditLog.create({ data: { actorId: userId, action: "business.public_restore", entityType: "Business", entityId: businessId, metadata: { slug: business.slug } } }),
  ]);
  return NextResponse.json({ success: true, data: { restoredAt } });
}

function result(code: string, error: string, status: number) {
  return NextResponse.json({ success: false, code, error }, { status });
}
