import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyApi } from "@/lib/server-api";

export async function GET(request: NextRequest) {
  try {
    const response = await proxyApi(request, "/v1/geo/map-config");
    if (response.ok) return response;
  } catch {
    // Fall through to the frontend's server-side configuration.
  }

  const accessToken = process.env.MAPBOX_PUBLIC_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: "Map display is not configured" },
      { status: 503 },
    );
  }

  return NextResponse.json({
    success: true,
    data: { accessToken, style: "mapbox://styles/mapbox/streets-v12" },
  });
}
