import { proxyApi } from "@/lib/server-api";
import type { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ photoReference: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { photoReference } = await context.params;
  const encodedReference = photoReference.map(encodeURIComponent).join("/");

  return proxyApi(
    request,
    `/v1/google-photos/${encodedReference}${request.nextUrl.search}`,
  );
}
