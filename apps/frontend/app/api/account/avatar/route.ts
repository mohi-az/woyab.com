import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

const maxAvatarBytes = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as { image?: string } | null;
  const image = body?.image;
  const match = image?.match(/^data:image\/(png|jpeg|webp);base64,([a-zA-Z0-9+/=]+)$/);

  if (!match) {
    return NextResponse.json({ error: "Please upload a PNG, JPG, or WebP image." }, { status: 400 });
  }

  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > maxAvatarBytes) {
    return NextResponse.json({ error: "Avatar image must be smaller than 2 MB." }, { status: 413 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(uploadDir, { recursive: true });

  const fileName = `${userId}-${Date.now()}.${extension}`;
  const filePath = path.join(uploadDir, fileName);
  const avatarUrl = `/uploads/avatars/${fileName}`;

  await writeFile(filePath, buffer);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: { avatarUrl: true },
  });

  return NextResponse.json({ data: user });
}
