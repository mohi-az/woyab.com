import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth-user";
import { storeBusinessImage } from "@/lib/business-image-storage";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  // Require authentication
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG and WebP images are allowed" }, { status: 415 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File size must not exceed 10 MB" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await storeBusinessImage({
    buffer,
    contentType: file.type,
    maxBytes: MAX_SIZE_BYTES,
  });

  return NextResponse.json({ url });
}
