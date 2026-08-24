import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { changePasswordSchema } from "@woyab/shared";
import { currentUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { isRateLimited, requestIp } from "@/lib/rate-limit";

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isRateLimited(`password:${userId}:${requestIp(request)}`, 5)) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const parsed = changePasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The new password does not meet the requirements." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "This account uses Google sign-in and does not have a local password." }, { status: 400 });
  }
  if (!(await compare(parsed.data.currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hash(parsed.data.newPassword, 12),
      passwordChangedAt: new Date(),
      authVersion: { increment: 1 },
    },
  });
  return NextResponse.json({ success: true });
}
