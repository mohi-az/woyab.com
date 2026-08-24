import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUser, isAdminRole } from "@/lib/admin-auth";
import { isRateLimited } from "@/lib/rate-limit";
import { proxyApi } from "@/lib/server-api";

type Context = { params: Promise<{ placeId: string }> };

const placeIdSchema = z.string().trim().min(8).max(255).regex(/^[A-Za-z0-9_-]+$/);
const languageSchema = z.enum(["de", "en", "fa"]).default("de");

export async function GET(request: NextRequest, { params }: Context) {
  const user = await currentUser();
  if (!user || !user.active || !isAdminRole(user.role) || !user.twoFactorEnabledAt || !user.twoFactorVerified) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isRateLimited(`google-place-details:admin:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many place requests." }, { status: 429 });
  }

  const { placeId } = await params;
  const parsedPlaceId = placeIdSchema.safeParse(placeId);
  const parsedLanguage = languageSchema.safeParse(request.nextUrl.searchParams.get("language") ?? "de");
  if (!parsedPlaceId.success || !parsedLanguage.success) {
    return NextResponse.json({ error: "Invalid place request." }, { status: 400 });
  }

  return proxyApi(
    request,
    `/v1/geo/place-details/${encodeURIComponent(parsedPlaceId.data)}?language=${parsedLanguage.data}`,
    { internal: true },
  );
}
