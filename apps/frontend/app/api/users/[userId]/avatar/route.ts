import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarData: true, avatarMimeType: true },
  });

  if (!user?.avatarData || !user.avatarMimeType?.startsWith("image/")) {
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }

  return new Response(user.avatarData, {
    headers: {
      "Content-Type": user.avatarMimeType,
      "Content-Length": String(user.avatarData.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
