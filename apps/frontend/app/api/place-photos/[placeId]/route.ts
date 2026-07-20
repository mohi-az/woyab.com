import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/auth-user";
import { isRateLimited } from "@/lib/rate-limit";
import { proxyApi } from "@/lib/server-api";

type Context = { params: Promise<{ placeId: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { placeId } = await params;
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isRateLimited(`google-place:user:${userId}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many place requests." }, { status: 429 });
  }

  const parsed = z.string().trim().min(8).max(255).regex(/^[A-Za-z0-9_-]+$/).safeParse(placeId);
  if (!parsed.success) return NextResponse.json({ error: "Invalid place ID." }, { status: 400 });
  return proxyApi(request, `/v1/geo/place-photos/${encodeURIComponent(parsed.data)}`, { internal: true });
}
