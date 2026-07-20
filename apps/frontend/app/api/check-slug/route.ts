import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isRateLimited(`check-slug:user:${userId}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const slug = request.nextUrl.searchParams.get("slug")?.trim() ?? "";

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ available: false });
  }

  const existing = await prisma.business.findUnique({
    where: { slug },
    select: { id: true },
  });

  return NextResponse.json({ available: !existing });
}
