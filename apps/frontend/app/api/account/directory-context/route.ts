import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ data: { favoriteBusinessIds: [], savedLocations: [] } });

  const [favorites, savedLocations] = await Promise.all([
    prisma.favorite.findMany({ where: { userId, business: { removedAt: null } }, select: { businessId: true } }),
    prisma.userSavedLocation.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      select: { id: true, label: true, icon: true, address: true, latitude: true, longitude: true, isDefault: true },
    }),
  ]);

  return NextResponse.json({
    data: {
      favoriteBusinessIds: favorites.map((item) => item.businessId),
      savedLocations,
    },
  });
}
