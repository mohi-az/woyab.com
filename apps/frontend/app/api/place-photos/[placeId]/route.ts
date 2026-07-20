import type { NextRequest } from "next/server";
import { proxyApi } from "@/lib/server-api";

type Context = { params: Promise<{ placeId: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { placeId } = await params;
  return proxyApi(request, `/v1/geo/place-photos/${encodeURIComponent(placeId)}`);
}
