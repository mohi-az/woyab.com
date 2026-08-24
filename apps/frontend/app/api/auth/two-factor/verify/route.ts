import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signIn } from "@/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isPersistentlyRateLimited } from "@/lib/persistent-rate-limit";
import { requestIp } from "@/lib/rate-limit";
import { verifyChallengeCookie, CHALLENGE_COOKIE_NAME } from "@/app/api/auth/two-factor/challenge/route";
import { decryptTwoFactorSecret, verifyTotp } from "@/lib/two-factor";

const bodySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  const ip = requestIp(request);

  if (await isPersistentlyRateLimited("2fa-verify-ip", ip, 10, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const cookieStore = await cookies();
  const challengeToken = cookieStore.get(CHALLENGE_COOKIE_NAME)?.value;

  if (!challengeToken) {
    return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
  }

  const userId = verifyChallengeCookie(challengeToken);
  if (!userId) {
    cookieStore.delete(CHALLENGE_COOKIE_NAME);
    return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
  }

  if (await isPersistentlyRateLimited("2fa-verify-user", userId, 8, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code format." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      active: true,
      twoFactorSecretEncrypted: true,
      twoFactorEnabledAt: true,
    },
  });

  if (!user?.active || !user.twoFactorEnabledAt || !user.twoFactorSecretEncrypted) {
    cookieStore.delete(CHALLENGE_COOKIE_NAME);
    return NextResponse.json({ error: "Two-factor authentication is not set up." }, { status: 401 });
  }

  const secret = decryptTwoFactorSecret(user.twoFactorSecretEncrypted);
  if (!verifyTotp(secret, parsed.data.code)) {
    return NextResponse.json({ error: "The code is incorrect or expired." }, { status: 400 });
  }

  // Code verified — delete challenge cookie
  cookieStore.delete(CHALLENGE_COOKIE_NAME);

  // Sign in via the two-factor-verified provider
  const internalSecret = process.env.TWO_FACTOR_ENCRYPTION_KEY || process.env.AUTH_SECRET || "woyab-default-dev-secret-key-for-2fa";
  try {
    await signIn("two-factor-verified", {
      userId: user.id,
      internalSecret,
      redirect: false,
    });
  } catch {
    // Next-auth may throw NEXT_REDIRECT even with redirect:false; ignore it
  }

  return NextResponse.json({ success: true });
}
