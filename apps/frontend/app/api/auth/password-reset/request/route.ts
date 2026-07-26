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
  if (isRateLimited(`password-reset:${ip}`, 100, 30 * 60_000)) {
    return NextResponse.json({ success: true });
  }
  if (await isPersistentlyRateLimited("password-reset-ip", ip, 100, 60 * 60_000)) {
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

  if (isRateLimited(`password-reset:${user.email}`, 100, 30 * 60_000)) {
    return NextResponse.json({ success: true });
  }
  if (await isPersistentlyRateLimited("password-reset-email", user.email, 100, 60 * 60_000)) {
    return NextResponse.json({ success: true });
  }

  const { token, tokenHash } = createPasswordResetToken();
  await prisma.$executeRaw`
    INSERT INTO "password_reset_tokens" ("id", "userId", "tokenHash", "expiresAt")
    VALUES (${randomBytes(16).toString("hex")}, ${user.id}, ${tokenHash}, ${passwordResetExpiry()})
  `;

  const resetUrl = `${resetBaseUrl(request)}/reset-password?token=${encodeURIComponent(token)}`;
  const htmlTemplate = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9f9f9; padding: 40px 20px;">
      <div style="max-w-md: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="width: 48px; height: 48px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
          <img src="https://ui-avatars.com/api/?name=Fargo&background=000&color=fff&rounded=true&bold=true" alt="Fargo Logo" style="width: 24px; height: 24px; border-radius: 4px;" />
        </div>
        <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #0f172a;">Reset your password</h1>
        <p style="margin: 0 0 24px; font-size: 16px; color: #334155; line-height: 1.5;">We received a request to reset the password for your account.</p>
        
        <a href="${resetUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 24px; border-radius: 6px; margin-bottom: 32px;">Reset password</a>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 24px;" />
        
        <p style="margin: 0 0 12px; font-size: 13px; color: #64748b;">This link expires in 30 minutes.</p>
        <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">If you didn't request to reset your password, you can safely ignore this email. Someone else might have typed your email address by mistake.</p>
      </div>
    </div>
  `;

  try {
    await sendMail({
      to: user.email,
      subject: "Reset your Fargo password",
      text: `We received a request to reset the password for your account.\n\nReset password: ${resetUrl}\n\nThis link expires in 30 minutes.\n\nIf you didn't request to reset your password, you can safely ignore this email.`,
      html: htmlTemplate,
    });
  } catch (error: any) {
    console.error("SMTP Error:", error);
    return NextResponse.json({ error: error.message || "Failed to send email." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
  });
}

