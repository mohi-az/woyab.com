import { proxyApi } from "@/lib/server-api";
import type { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { businessId } = await context.params;

  return proxyApi(
    request,
    `/v1/businesses/${encodeURIComponent(businessId)}/google-photo-thumbnail${request.nextUrl.search}`,
    { internal: true },
  );
}
