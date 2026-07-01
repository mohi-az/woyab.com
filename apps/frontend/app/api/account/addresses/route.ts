import { NextResponse } from "next/server";
import { savedLocationSchema } from "@fargo/shared";
import { currentUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = savedLocationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the address fields." }, { status: 400 });

  const duplicate = await prisma.userSavedLocation.findUnique({ where: { userId_label: { userId, label: parsed.data.label } } });
  if (duplicate) return NextResponse.json({ error: "You already use this label." }, { status: 409 });

  const location = await prisma.$transaction(async (tx) => {
    if (parsed.data.isDefault) await tx.userSavedLocation.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.userSavedLocation.create({
      data: {
        userId,
        ...parsed.data,
        cityName: parsed.data.cityName || null,
        districtName: parsed.data.districtName || null,
      },
    });
  });
  return NextResponse.json({ data: location }, { status: 201 });
}
