import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { passwordResetRequestSchema } from "@fargo/shared";
import { currentUserId } from "@/lib/auth-user";
import { sendMail } from "@/lib/mail";
import { createPasswordResetToken, passwordResetExpiry } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { isRateLimited, requestIp } from "@/lib/rate-limit";
import { isPersistentlyRateLimited } from "@/lib/persistent-rate-limit";

function resetBaseUrl(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || new URL(request.url).origin;
}

export async function POST(request: Request) {
  const ip = requestIp(request);
  if (isRateLimited(`password-reset:${ip}`, 6, 30 * 60_000)) {
    return NextResponse.json({ success: true });
  }
  if (await isPersistentlyRateLimited("password-reset-ip", ip, 8, 60 * 60_000)) {
    return NextResponse.json({ success: true });
  }

  const parsed = passwordResetRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ success: true });

  const userId = await currentUserId();
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } })
    : parsed.data.email
      ? await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, email: true, name: true } })
      : null;

  if (!user?.email) return NextResponse.json({ success: true });

  if (isRateLimited(`password-reset:${user.email}`, 3, 30 * 60_000)) {
    return NextResponse.json({ success: true });
  }
  if (await isPersistentlyRateLimited("password-reset-email", user.email, 4, 60 * 60_000)) {
    return NextResponse.json({ success: true });
  }

  const { token, tokenHash } = createPasswordResetToken();
  await prisma.$executeRaw`
    INSERT INTO "password_reset_tokens" ("id", "userId", "tokenHash", "expiresAt")
    VALUES (${randomBytes(16).toString("hex")}, ${user.id}, ${tokenHash}, ${passwordResetExpiry()})
  `;

  const resetUrl = `${resetBaseUrl(request)}/reset-password?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: user.email,
    subject: "Set or reset your Fargo password",
    text: `Use this link to set or reset your Fargo password. It expires in 30 minutes:\n\n${resetUrl}`,
    html: `<p>Use this link to set or reset your Fargo password. It expires in 30 minutes.</p><p><a href="${resetUrl}">Set or reset password</a></p>`,
  });

  return NextResponse.json({
    success: true,
    devLink: process.env.NODE_ENV === "production" ? undefined : resetUrl,
  });
}
