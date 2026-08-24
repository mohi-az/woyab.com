import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { businessImageContentType, businessImageStoragePath } from "@/lib/business-image-storage";

type RouteContext = { params: Promise<{ filename: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { filename } = await context.params;
  const filePath = businessImageStoragePath(filename);
  const contentType = businessImageContentType(filename);
  if (!filePath || !contentType) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  try {
    const image = await readFile(filePath);
    return new Response(image, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(image.length),
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const code = error instanceof Error && "code" in error
      ? String((error as NodeJS.ErrnoException).code)
      : null;
    if (code === "ENOENT") {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }
    throw error;
  }
}
