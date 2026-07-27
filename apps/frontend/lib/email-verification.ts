import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { sendMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 24 * 60 * 60_000;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function appBaseUrl(request?: Request) {
  return process.env.NEXT_PUBLIC_APP_URL
    || process.env.AUTH_URL
    || (request ? new URL(request.url).origin : "http://localhost:3000");
}

export async function sendAccountVerification(input: {
  userId: string;
  email: string;
  name?: string | null;
  callbackUrl?: string;
  request?: Request;
}) {
  const token = randomBytes(32).toString("base64url");
  const hash = tokenHash(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({
      where: { userId: input.userId, usedAt: null },
    }),
    prisma.emailVerificationToken.create({
      data: { userId: input.userId, tokenHash: hash, expiresAt },
    }),
  ]);

  let verifyUrl = `${appBaseUrl(input.request)}/api/auth/email-verification/verify?token=${encodeURIComponent(token)}`;
  if (input.callbackUrl) {
    verifyUrl += `&callbackUrl=${encodeURIComponent(input.callbackUrl)}`;
  }
  
  await sendMail({
    to: input.email,
    subject: "Verify your Fargo email address",
    text: `Hello ${input.name || "there"},\n\nVerify your Fargo email address using this link. It expires in 24 hours:\n\n${verifyUrl}`,
    html: `<p>Hello ${escapeHtml(input.name || "there")},</p><p>Verify your Fargo email address using the link below. It expires in 24 hours.</p><p><a href="${verifyUrl}">Verify email address</a></p>`,
  });
  return process.env.NODE_ENV === "production" ? undefined : verifyUrl;
}

export async function consumeAccountVerification(token: string) {
  const hash = tokenHash(token);
  return prisma.$transaction(async (tx) => {
    const record = await tx.emailVerificationToken.findUnique({
      where: { tokenHash: hash },
      include: { user: { select: { id: true, emailVerified: true } } },
    });
    if (!record || record.usedAt || record.expiresAt <= new Date()) return false;

    const now = new Date();
    const consumed = await tx.emailVerificationToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (!consumed.count) return false;
    await tx.user.update({
      where: { id: record.userId },
      data: { emailVerified: now, authVersion: { increment: 1 } },
    });
    await tx.emailVerificationToken.deleteMany({
      where: { userId: record.userId, id: { not: record.id } },
    });
    return true;
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}
