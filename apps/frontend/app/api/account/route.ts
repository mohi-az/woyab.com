import fs from "node:fs/promises";
import path from "node:path";
import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/auth-user";
import { isPersistentlyRateLimited } from "@/lib/persistent-rate-limit";
import { prisma } from "@/lib/prisma";

const deletionSchema = z.object({
  password: z.string().optional(),
  confirmation: z.literal("DELETE"),
  mode: z.enum(["ERASE", "ANONYMIZE"]).default("ERASE"),
});

export async function DELETE(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await isPersistentlyRateLimited("account-delete", userId, 5, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const parsed = deletionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Type DELETE to confirm account deletion." }, { status: 400 });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, role: true, avatarUrl: true },
  });
  if (!user) return NextResponse.json({ success: true });
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Administrator accounts must be removed by another super administrator." }, { status: 403 });
  }
  if (user.passwordHash && (!parsed.data.password || !await compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    const votedReviewIds = await tx.reviewHelpfulVote.findMany({
      where: { userId },
      select: { reviewId: true },
    });
    await tx.reviewHelpfulVote.deleteMany({ where: { userId } });
    for (const { reviewId } of votedReviewIds) {
      await tx.review.updateMany({
        where: { id: reviewId, helpfulCount: { gt: 0 } },
        data: { helpfulCount: { decrement: 1 } },
      });
    }

    if (parsed.data.mode === "ERASE") {
      await tx.review.deleteMany({ where: { userId } });
    } else {
      await tx.review.updateMany({ where: { userId }, data: { userId: null } });
    }

    await tx.business.updateMany({ where: { ownerId: userId }, data: { ownerId: null } });
    await tx.business.updateMany({ where: { removedById: userId }, data: { removedById: null } });
    await tx.reviewOwnerReply.updateMany({ where: { ownerId: userId }, data: { ownerId: null } });
    await tx.businessClaim.updateMany({
      where: { claimantUserId: userId },
      data: {
        claimantUserId: null,
        claimantName: "Anonymized",
        claimantEmail: "anonymized@invalid.local",
        claimantPhone: null,
        message: null,
        officialBusinessEmail: null,
        officialUrl: null,
        otpHash: null,
        otpExpiresAt: null,
        anonymizedAt: new Date(),
      },
    });
    await tx.businessChangeRequest.updateMany({
      where: { submitterUserId: userId },
      data: {
        submitterUserId: null,
        additionalContext: null,
        evidenceUrl: null,
        payload: { redacted: true },
        snapshot: { redacted: true },
        anonymizedAt: new Date(),
      },
    });
    await tx.directoryReport.updateMany({
      where: { reporterUserId: userId },
      data: { reporterUserId: null, reporterName: null, reporterEmail: null },
    });
    await tx.supportTicket.deleteMany({ where: { userId } });
    await tx.supportTicketReply.deleteMany({ where: { authorId: userId } });
    await tx.adminAuditLog.updateMany({ where: { actorId: userId }, data: { actorId: null } });
    await tx.$executeRaw`
      UPDATE "admin_audit_logs"
      SET "metadata" = ("metadata" - 'ownerId' - 'claimantUserId')
      WHERE "metadata"->>'ownerId' = ${userId}
         OR "metadata"->>'claimantUserId' = ${userId}
    `;
    await tx.user.delete({ where: { id: userId } });
  }, { isolationLevel: "Serializable" });

  await deleteLocalAvatar(user.avatarUrl);
  return NextResponse.json({ success: true, mode: parsed.data.mode });
}

async function deleteLocalAvatar(avatarUrl: string | null) {
  if (!avatarUrl?.startsWith("/uploads/avatars/")) return;
  const root = path.resolve(process.cwd(), "public", "uploads", "avatars");
  const target = path.resolve(process.cwd(), "public", avatarUrl.replace(/^\/+/, ""));
  if (target === root || !target.startsWith(`${root}${path.sep}`)) return;
  await fs.unlink(target).catch(() => undefined);
}
