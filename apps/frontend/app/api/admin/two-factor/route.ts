import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { isPersistentlyRateLimited } from "@/lib/persistent-rate-limit";
import { prisma } from "@/lib/prisma";
import {
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  generateTwoFactorSecret,
  twoFactorUri,
  verifyTotp,
} from "@/lib/two-factor";

const passwordSchema = z.object({ password: z.string().min(1) });
const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/) });

async function adminIdentity() {
  const session = await auth();
  if (!session?.user?.id || session.user.invalid) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      active: true,
      passwordHash: true,
      twoFactorSecretEncrypted: true,
      twoFactorEnabledAt: true,
    },
  });
  return user?.active && (user.role === "ADMIN" || user.role === "SUPER_ADMIN") ? user : null;
}

export async function POST(request: Request) {
  const user = await adminIdentity();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isPersistentlyRateLimited("admin-2fa-setup", user.id, 5, 30 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }
  if (user.twoFactorEnabledAt) {
    return NextResponse.json({ error: "Two-factor authentication is already enabled." }, { status: 409 });
  }
  const parsed = passwordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !user.passwordHash || !await compare(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const secret = generateTwoFactorSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecretEncrypted: encryptTwoFactorSecret(secret) },
  });
  return NextResponse.json({
    secret,
    uri: twoFactorUri(user.email || user.id, secret),
  });
}

export async function PUT(request: Request) {
  const user = await adminIdentity();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isPersistentlyRateLimited("admin-2fa-confirm", user.id, 8, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }
  const parsed = codeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !user.twoFactorSecretEncrypted) {
    return NextResponse.json({ error: "Start setup before confirming a code." }, { status: 400 });
  }
  const valid = verifyTotp(decryptTwoFactorSecret(user.twoFactorSecretEncrypted), parsed.data.code);
  if (!valid) return NextResponse.json({ error: "The verification code is invalid." }, { status: 400 });

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabledAt: new Date(), authVersion: { increment: 1 } },
  });
  await prisma.adminAuditLog.create({
    data: {
      actorId: user.id,
      action: "admin.two_factor.enabled",
      entityType: "User",
      entityId: user.id,
    },
  });
  return NextResponse.json({ success: true });
}
