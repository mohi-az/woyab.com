import type { NextRequest } from "next/server";
import { proxyApi } from "@/lib/server-api";

export function POST(request: NextRequest) {
  return proxyApi(request, "/v1/geo/suggestions");
}
