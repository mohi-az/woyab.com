import type { NextRequest } from "next/server";
import { proxyApi } from "@/lib/server-api";

export function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref") ?? "";
  const maxWidth = request.nextUrl.searchParams.get("maxWidth") ?? "800";
  return proxyApi(request, `/v1/geo/place-photo?ref=${encodeURIComponent(ref)}&maxWidth=${maxWidth}`);
}
