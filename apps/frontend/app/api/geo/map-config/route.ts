import type { NextRequest } from "next/server";
import { proxyApi } from "@/lib/server-api";

export function GET(request: NextRequest) {
  return proxyApi(request, "/v1/geo/map-config");
}
