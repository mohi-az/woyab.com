import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
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
