import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ businessId: string }> };
const bodySchema = z.object({ confirmation: z.string().trim().min(1).max(300) });

export async function POST(request: Request, context: Context) {
  const userId = await currentUserId();
  if (!userId) return result("AUTH_REQUIRED", "Sign in required.", 401);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return result("INVALID_CONFIRMATION", "Enter the business name to confirm removal.", 400);
  const { businessId } = await context.params;
  const [business, user] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId }, select: { id: true, slug: true, businessName: true, ownerId: true, removedAt: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true, active: true } }),
  ]);
  if (!business) return result("BUSINESS_NOT_FOUND", "Business not found.", 404);
  if (!user?.active || (business.ownerId !== userId && !["ADMIN", "SUPER_ADMIN"].includes(user.role))) return result("FORBIDDEN", "You cannot remove this business.", 403);
  if (parsed.data.confirmation !== business.businessName) return result("INVALID_CONFIRMATION", "The business name does not match.", 400);
  if (business.removedAt) return NextResponse.json({ success: true, data: { removedAt: business.removedAt, message: removalMessage } });

  const removedAt = new Date();
  await prisma.$transaction([
    prisma.business.update({ where: { id: businessId }, data: { removedAt, removedById: userId, restoredAt: null } }),
    prisma.adminAuditLog.create({ data: { actorId: userId, action: "business.public_remove", entityType: "Business", entityId: businessId, metadata: { slug: business.slug } } }),
  ]);
  return NextResponse.json({ success: true, data: { removedAt, message: removalMessage } });
}

const removalMessage = "Your business has been removed from public view. You may restore it anytime.";

function result(code: string, error: string, status: number) {
  return NextResponse.json({ success: false, code, error }, { status });
}
