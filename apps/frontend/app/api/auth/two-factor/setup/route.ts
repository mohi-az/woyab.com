import { compare, hash } from "bcryptjs";
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

const setupSchema = z.object({
  password: z.string().optional(),
  newPassword: z.string().optional(),
});
const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/) });
const passwordSchema = z.object({ password: z.string().min(1) });

async function getAuthenticatedUser() {
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
  return user?.active ? user : null;
}

// POST: Start 2FA setup — verify password (or create one), generate secret
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.twoFactorEnabledAt) {
    return NextResponse.json({ error: "Two-factor authentication is already enabled." }, { status: 409 });
  }

  if (await isPersistentlyRateLimited("user-2fa-setup", user.id, 5, 30 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const parsed = setupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request data." }, { status: 400 });
  }

  const { password, newPassword } = parsed.data;

  // Handle password verification or creation
  let updateData: { twoFactorSecretEncrypted: string; passwordHash?: string } = {
    twoFactorSecretEncrypted: "",
  };

  if (user.passwordHash) {
    if (!password || !(await compare(password, user.passwordHash))) {
      return NextResponse.json({ error: "Current password is incorrect.", errorCode: "incorrectPassword" }, { status: 400 });
    }
  } else {
    if (!newPassword || newPassword.length < 10) {
      return NextResponse.json({ error: "A valid new password is required (min 10 characters).", errorCode: "passwordTooShort" }, { status: 400 });
    }
    updateData.passwordHash = await hash(newPassword, 12);
  }

  const secret = generateTwoFactorSecret();
  updateData.twoFactorSecretEncrypted = encryptTwoFactorSecret(secret);

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });

  return NextResponse.json({
    secret,
    uri: twoFactorUri(user.email || user.id, secret),
  });
}

// PUT: Confirm 2FA setup — verify TOTP code and enable
export async function PUT(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.twoFactorEnabledAt) {
    return NextResponse.json({ error: "Two-factor authentication is already enabled." }, { status: 409 });
  }

  if (await isPersistentlyRateLimited("user-2fa-confirm", user.id, 8, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const parsed = codeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !user.twoFactorSecretEncrypted) {
    return NextResponse.json({ error: "Start setup before confirming a code." }, { status: 400 });
  }

  if (!verifyTotp(decryptTwoFactorSecret(user.twoFactorSecretEncrypted), parsed.data.code)) {
    return NextResponse.json({ error: "The verification code is invalid.", errorCode: "invalidCode" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabledAt: new Date(), authVersion: { increment: 1 } },
  });

  return NextResponse.json({ success: true });
}

// DELETE: Disable 2FA — verify password
export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!user.twoFactorEnabledAt) {
    return NextResponse.json({ error: "Two-factor authentication is not enabled." }, { status: 409 });
  }

  if (await isPersistentlyRateLimited("user-2fa-disable", user.id, 5, 30 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const parsed = passwordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !user.passwordHash || !(await compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect.", errorCode: "incorrectPassword" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabledAt: null,
      twoFactorSecretEncrypted: null,
      authVersion: { increment: 1 },
    },
  });

  return NextResponse.json({ success: true });
}
