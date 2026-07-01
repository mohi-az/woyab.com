import type { NextRequest } from "next/server";
import { proxyApi } from "@/lib/server-api";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { businessId } = await context.params;
  return proxyApi(request, `/v1/businesses/${businessId}/reviews`);
}
