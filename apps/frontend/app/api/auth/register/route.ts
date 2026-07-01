import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { registerSchema } from "@fargo/shared";
import { prisma } from "@/lib/prisma";
import { isRateLimited, requestIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (isRateLimited(`register:${requestIp(request)}`, 5)) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the submitted fields.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await hash(parsed.data.password, 12);
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      passwordChangedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
