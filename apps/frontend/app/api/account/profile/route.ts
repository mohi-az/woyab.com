import { NextResponse } from "next/server";
import { profileSchema } from "@woyab/shared";
import { currentUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the submitted fields.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const phone = parsed.data.phone || null;
  if (phone) {
    const owner = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
    if (owner && owner.id !== userId) return NextResponse.json({ error: "This phone number is already in use." }, { status: 409 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: parsed.data.name, phone, avatarUrl: parsed.data.avatarUrl || null },
    select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
  });
  return NextResponse.json({ data: user });
}
