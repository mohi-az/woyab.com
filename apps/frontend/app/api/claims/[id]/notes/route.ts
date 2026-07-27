import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { currentUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "claim-notes");

export async function GET(_request: Request, context: Context) {
  const userId = await currentUserId();
  if (!userId) return reply("AUTH_REQUIRED", "Sign in required.", 401);
  const { id } = await context.params;

  const claim = await prisma.businessClaim.findFirst({
    where: { id, claimantUserId: userId },
    select: { id: true },
  });
  if (!claim) return reply("CLAIM_NOT_FOUND", "Claim not found.", 404);

  const notes = await prisma.claimNote.findMany({
    where: { claimId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      attachmentUrl: true,
      attachmentName: true,
      attachments: true,
      isAdminNote: true,
      createdAt: true,
      author: { select: { name: true, role: true } },
    },
  });

  return NextResponse.json({ success: true, data: { notes } });
}

export async function POST(request: Request, context: Context) {
  const userId = await currentUserId();
  if (!userId) return reply("AUTH_REQUIRED", "Sign in required.", 401);
  const { id } = await context.params;

  const claim = await prisma.businessClaim.findFirst({
    where: { id, claimantUserId: userId, status: { in: ["UNDER_REVIEW", "PENDING_VERIFICATION"] } },
    select: { id: true },
  });
  if (!claim) return reply("CLAIM_NOT_FOUND", "Claim not found or not editable.", 404);

  const formData = await request.formData();
  const content = formData.get("content");
  if (!content || typeof content !== "string" || content.trim().length < 1) {
    return reply("INVALID_CONTENT", "Message content is required.", 400);
  }
  if (content.length > 2000) {
    return reply("CONTENT_TOO_LONG", "Message must be under 2000 characters.", 400);
  }

  let attachmentUrl: string | null = null;
  let attachmentName: string | null = null;
  const files = formData.getAll("attachment");
  const attachments: { url: string; name: string }[] = [];

  for (const file of files) {
    if (file && file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE_SIZE) {
        return reply("FILE_TOO_LARGE", `File ${file.name} exceeds 5 MB limit.`, 400);
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return reply("INVALID_FILE_TYPE", `File ${file.name} is not a supported type.`, 400);
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const filename = `${randomUUID()}.${ext}`;
      await mkdir(UPLOAD_DIR, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(join(UPLOAD_DIR, filename), buffer);
      attachments.push({
        url: `/uploads/claim-notes/${filename}`,
        name: file.name
      });
    }
  }
  
  // For backwards compatibility with single-file expectations in legacy clients
  if (attachments.length > 0) {
    attachmentUrl = attachments[0].url;
    attachmentName = attachments[0].name;
  }

  let note;
  try {
    note = await prisma.claimNote.create({
      data: {
        claimId: id,
        authorId: userId,
        content: content.trim(),
        attachmentUrl,
        attachmentName,
        attachments: attachments.length > 0 ? attachments : undefined,
        isAdminNote: false,
      },
      select: {
        id: true,
        content: true,
        attachmentUrl: true,
        attachmentName: true,
        attachments: true,
        isAdminNote: true,
        createdAt: true,
        author: { select: { name: true, role: true } },
      },
    });
  } catch (error: any) {
    console.error("Failed to create claim note:", error);
    return reply("DATABASE_ERROR", error.message || "Failed to save note to database.", 500);
  }

  return NextResponse.json({ success: true, data: note }, { status: 201 });
}

function reply(code: string, error: string, status: number) {
  return NextResponse.json({ success: false, code, error }, { status });
}
