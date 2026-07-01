import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { password?: string; confirmation?: string };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });

  const confirmed = user?.passwordHash
    ? Boolean(body.password && await compare(body.password, user.passwordHash))
    : body.confirmation === "DELETE";
  if (!confirmed) return NextResponse.json({ error: "Account deletion was not confirmed." }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.review.deleteMany({ where: { userId } });
    await tx.business.updateMany({ where: { ownerId: userId }, data: { ownerId: null } });
    await tx.user.delete({ where: { id: userId } });
  });
  return NextResponse.json({ success: true });
}
