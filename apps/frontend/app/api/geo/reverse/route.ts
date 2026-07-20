import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isRateLimited, requestIp } from "@/lib/rate-limit";
import { proxyApi } from "@/lib/server-api";

export function POST(request: NextRequest) {
  if (isRateLimited(`geo-reverse:ip:${requestIp(request)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many location requests." }, { status: 429 });
  }
  return proxyApi(request, "/v1/geo/reverse");
}
