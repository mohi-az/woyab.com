import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/auth-user";
import { isRateLimited } from "@/lib/rate-limit";
import { proxyApi } from "@/lib/server-api";

const photoQuerySchema = z.object({
  ref: z.string().trim().min(8).max(1_000),
  placeId: z.string().trim().min(8).max(255).regex(/^[A-Za-z0-9_-]+$/),
  maxWidth: z.coerce.number().int().min(100).max(1_600).default(800),
});

export async function GET(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isRateLimited(`google-photo:user:${userId}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many photo requests." }, { status: 429 });
  }

  const parsed = photoQuerySchema.safeParse({
    ref: request.nextUrl.searchParams.get("ref"),
    placeId: request.nextUrl.searchParams.get("placeId"),
    maxWidth: request.nextUrl.searchParams.get("maxWidth") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid photo request." }, { status: 400 });

  return proxyApi(
    request,
    `/v1/geo/place-photo?ref=${encodeURIComponent(parsed.data.ref)}&placeId=${encodeURIComponent(parsed.data.placeId)}&maxWidth=${parsed.data.maxWidth}`,
    { internal: true },
  );
}
