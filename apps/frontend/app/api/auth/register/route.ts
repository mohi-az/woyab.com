import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { registerSchema } from "@fargo/shared";
import { sendAccountVerification } from "@/lib/email-verification";
import { isPersistentlyRateLimited } from "@/lib/persistent-rate-limit";
import { prisma } from "@/lib/prisma";
import { isRateLimited, requestIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = requestIp(request);
  if (
    isRateLimited(`register:${ip}`, 5, 60 * 60_000)
    || await isPersistentlyRateLimited("register-ip", ip, 5, 60 * 60_000)
  ) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const raw = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (typeof raw?.website === "string" && raw.website.trim()) {
    return NextResponse.json({ success: true, verificationRequired: true }, { status: 202 });
  }
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the submitted fields.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  if (await isPersistentlyRateLimited("register-email", email, 3, 60 * 60_000)) {
    return NextResponse.json({ success: true, verificationRequired: true }, { status: 202 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (!existing.emailVerified && existing.active) {
      await sendAccountVerification({
        userId: existing.id,
        email,
        name: existing.name,
        callbackUrl: typeof raw?.callbackUrl === "string" ? raw.callbackUrl : undefined,
        request,
      }).catch(() => undefined);
    }
    return NextResponse.json({ success: true, verificationRequired: true }, { status: 202 });
  }

  const passwordHash = await hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      passwordChangedAt: new Date(),
    },
    select: { id: true, email: true, name: true },
  });

  const callbackUrl = typeof raw?.callbackUrl === "string" ? raw.callbackUrl : undefined;

  let devLink: string | undefined;
  try {
    devLink = await sendAccountVerification({
      userId: user.id,
      email: user.email!,
      name: user.name,
      callbackUrl,
      request,
    });
  } catch {
    return NextResponse.json({
      success: true,
      verificationRequired: true,
      emailDeliveryFailed: true,
    }, { status: 202 });
  }

  return NextResponse.json({
    success: true,
    verificationRequired: true,
    devLink,
  }, { status: 201 });
}
