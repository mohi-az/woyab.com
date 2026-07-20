import { NextRequest } from "next/server";
import { currentUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { proxyApi } from "@/lib/server-api";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { favoritesOnly, ...map } = body;
  if (favoritesOnly) {
    const userId = await currentUserId();
    const favorites = userId
      ? await prisma.favorite.findMany({
          where: { userId, business: { removedAt: null, status: "ACTIVE" } },
          select: { businessId: true },
        })
      : [];
    map.favoriteBusinessIds = favorites.map((item) => item.businessId);
  }
  return proxyApi(new NextRequest(request.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(map),
  }), "/v1/businesses/map");
}
