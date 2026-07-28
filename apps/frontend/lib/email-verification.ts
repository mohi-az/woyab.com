import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { sendMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { buildAccountVerificationEmail } from "@/lib/email-templates";

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
  let locale = "fa";
  if (input.request) {
    const cookieHeader = input.request.headers.get("cookie") || "";
    if (cookieHeader.includes("NEXT_LOCALE=en")) locale = "en";
    if (cookieHeader.includes("NEXT_LOCALE=de")) locale = "de";
  }

  const emailContent = buildAccountVerificationEmail({
    name: input.name,
    verifyUrl,
    locale,
  });

  await sendMail({
    to: input.email,
    ...emailContent,
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
