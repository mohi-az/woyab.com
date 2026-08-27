import type { NextRequest } from "next/server";
import { proxyApi } from "@/lib/server-api";

type RouteContext = { params: Promise<{ businessId: string; photoReference: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { businessId, photoReference } = await context.params;
  const encodedReference = photoReference.map(encodeURIComponent).join("/");
  return proxyApi(request, `/v1/businesses/${encodeURIComponent(businessId)}/google-photos/${encodedReference}${request.nextUrl.search}`, { internal: true });
}
