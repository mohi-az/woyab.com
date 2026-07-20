import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isRateLimited, requestIp } from "@/lib/rate-limit";
import { proxyApi } from "@/lib/server-api";

export function POST(request: NextRequest) {
  if (isRateLimited(`geo-suggest:ip:${requestIp(request)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many location searches." }, { status: 429 });
  }
  return proxyApi(request, "/v1/geo/suggestions");
}
