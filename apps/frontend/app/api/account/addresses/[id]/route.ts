import { NextResponse } from "next/server";
import { savedLocationSchema } from "@fargo/shared";
import { currentUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = savedLocationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the address fields." }, { status: 400 });

  const owned = await prisma.userSavedLocation.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Address not found" }, { status: 404 });

  const duplicate = await prisma.userSavedLocation.findFirst({ where: { userId, label: parsed.data.label, NOT: { id } }, select: { id: true } });
  if (duplicate) return NextResponse.json({ error: "You already use this label." }, { status: 409 });

  const location = await prisma.$transaction(async (tx) => {
    if (parsed.data.isDefault) await tx.userSavedLocation.updateMany({ where: { userId, NOT: { id } }, data: { isDefault: false } });
    return tx.userSavedLocation.update({
      where: { id },
      data: { ...parsed.data, cityName: parsed.data.cityName || null, districtName: parsed.data.districtName || null },
    });
  });
  return NextResponse.json({ data: location });
}

export async function DELETE(_request: Request, { params }: Context) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await prisma.userSavedLocation.deleteMany({ where: { id, userId } });
  if (!result.count) return NextResponse.json({ error: "Address not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
