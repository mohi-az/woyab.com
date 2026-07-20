import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sendAccountVerification } from "@/lib/email-verification";
import { isPersistentlyRateLimited } from "@/lib/persistent-rate-limit";
import { prisma } from "@/lib/prisma";
import { requestIp } from "@/lib/rate-limit";

const schema = z.object({ email: z.email().transform((value) => value.trim().toLowerCase()) });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: true });
  const limited = await Promise.all([
    isPersistentlyRateLimited("verify-resend-ip", requestIp(request), 5, 60 * 60_000),
    isPersistentlyRateLimited("verify-resend-email", parsed.data.email, 3, 60 * 60_000),
  ]);
  if (limited.some(Boolean)) return NextResponse.json({ success: true });

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, name: true, emailVerified: true, active: true },
  });
  if (user?.email && !user.emailVerified && user.active) {
    await sendAccountVerification({
      userId: user.id,
      email: user.email,
      name: user.name,
      request,
    }).catch(() => undefined);
  }
  return NextResponse.json({ success: true });
}
