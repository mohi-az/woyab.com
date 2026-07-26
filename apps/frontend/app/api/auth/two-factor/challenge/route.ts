import { compare } from "bcryptjs";
import { createHmac, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isPersistentlyRateLimited } from "@/lib/persistent-rate-limit";
import { requestIp } from "@/lib/rate-limit";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const CHALLENGE_COOKIE_NAME = "fargo_2fa_challenge";
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function hmacSecret() {
  const secret = process.env.TWO_FACTOR_ENCRYPTION_KEY || process.env.AUTH_SECRET || "fargo-default-dev-secret-key-for-2fa";
  return secret;
}

export function signChallenge(userId: string, nonce: string, expiresAt: number) {
  const payload = `${userId}:${nonce}:${expiresAt}`;
  const sig = createHmac("sha256", hmacSecret()).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyChallengeCookie(token: string): string | null {
  try {
    const dotIndex = token.lastIndexOf(".");
    if (dotIndex === -1) return null;
    const payloadB64 = token.slice(0, dotIndex);
    const sig = token.slice(dotIndex + 1);
    const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
    const expectedSig = createHmac("sha256", hmacSecret()).update(payload).digest("base64url");
    if (sig !== expectedSig) return null;
    const parts = payload.split(":");
    if (parts.length < 3) return null;
    const expiresAt = Number(parts[parts.length - 1]);
    const userId = parts.slice(0, parts.length - 2).join(":");
    if (!userId || isNaN(expiresAt)) return null;
    if (Date.now() > expiresAt) return null;
    return userId;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const ip = requestIp(request);

  if (await isPersistentlyRateLimited("2fa-challenge-ip", ip, 20, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  if (await isPersistentlyRateLimited("2fa-challenge-email", email, 10, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      active: true,
      emailVerified: true,
      twoFactorEnabledAt: true,
    },
  });

  if (!user?.passwordHash || !user.active || !user.emailVerified) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  if (!(await compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  // 2FA not enabled: tell client to proceed with normal signIn
  if (!user.twoFactorEnabledAt) {
    return NextResponse.json({ twoFactorRequired: false });
  }

  // 2FA enabled: create a signed, short-lived challenge cookie
  const nonce = randomBytes(8).toString("base64url");
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  const token = signChallenge(user.id, nonce, expiresAt);

  const cookieStore = await cookies();
  cookieStore.set(CHALLENGE_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(CHALLENGE_TTL_MS / 1000),
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ twoFactorRequired: true });
}
