import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { passwordResetConfirmSchema } from "@woyab/shared";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { isRateLimited, requestIp } from "@/lib/rate-limit";

type ResetTokenRow = {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export async function POST(request: Request) {
  if (isRateLimited(`password-reset-confirm:${requestIp(request)}`, 8, 30 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const parsed = passwordResetConfirmSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the submitted fields." }, { status: 400 });
  }

  const tokenHash = hashPasswordResetToken(parsed.data.token);
  const resetTokens = await prisma.$queryRaw<ResetTokenRow[]>`
    SELECT "id", "userId", "expiresAt", "usedAt"
    FROM "password_reset_tokens"
    WHERE "tokenHash" = ${tokenHash}
    LIMIT 1
  `;
  const resetToken = resetTokens[0];

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
    return NextResponse.json({ error: "This password reset link is invalid or expired." }, { status: 400 });
  }

  const now = new Date();
  const passwordHash = await hash(parsed.data.password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        passwordChangedAt: now,
        authVersion: { increment: 1 },
      },
    }),
    prisma.$executeRaw`
      UPDATE "password_reset_tokens"
      SET "usedAt" = ${now}
      WHERE "id" = ${resetToken.id}
    `,
    prisma.$executeRaw`
      UPDATE "password_reset_tokens"
      SET "usedAt" = ${now}
      WHERE "userId" = ${resetToken.userId} AND "usedAt" IS NULL AND "id" <> ${resetToken.id}
    `,
  ]);

  return NextResponse.json({ success: true });
}
