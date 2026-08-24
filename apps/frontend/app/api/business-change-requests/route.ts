import { businessChangeRequestCreateSchema } from "@woyab/shared";
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth-user";
import { businessChangeSnapshot, parseChangePayload } from "@/lib/business-change-requests";
import { prisma } from "@/lib/prisma";
import { isPersistentlyRateLimited } from "@/lib/persistent-rate-limit";

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return response("AUTH_REQUIRED", "Sign in before suggesting a change.", 401);
  if (await isPersistentlyRateLimited("business-change-request", userId, 10, 60 * 60_000)) {
    return response("RATE_LIMITED", "Too many change requests.", 429);
  }
  const parsed = businessChangeRequestCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response("INVALID_FIELDS", "Please check the suggested changes.", 400, parsed.error.flatten().fieldErrors);

  let payload: ReturnType<typeof parseChangePayload>;
  try {
    payload = parseChangePayload(parsed.data.kind, parsed.data.payload);
  } catch (error) {
    return response("INVALID_FIELDS", error instanceof Error ? error.message : "Invalid change payload.", 400);
  }

  const snapshot = await businessChangeSnapshot(parsed.data.businessId);
  if (!snapshot) return response("BUSINESS_NOT_FOUND", "Business not found.", 404);
  if (snapshot.removedAt) return response("BUSINESS_REMOVED", "This business is not publicly available.", 409);
  if (snapshot.status !== "ACTIVE") return response("BUSINESS_NOT_FOUND", "Business not found.", 404);
  if (parsed.data.submitterRelation === "OWNER" && snapshot.ownerId !== userId) return response("FORBIDDEN", "Only the verified owner can submit owner changes.", 403);

  if (parsed.data.kind === "DETAILS" && payload && "changes" in payload && Array.isArray((payload as { changes: Array<{ field: string }> }).changes)) {
    const requestedFields = new Set((payload as { changes: Array<{ field: string }> }).changes.map((c) => c.field));
    const activeRequests = await prisma.businessChangeRequest.findMany({
      where: { businessId: parsed.data.businessId, submitterUserId: userId, kind: "DETAILS", status: "PENDING" },
      select: { id: true, payload: true },
    });
    const hasDuplicateField = activeRequests.some((req) => {
      const p = req.payload as { changes?: Array<{ field: string }> } | null;
      if (p && Array.isArray(p.changes)) {
        return p.changes.some((c) => requestedFields.has(c.field));
      }
      return false;
    });
    if (hasDuplicateField) {
      return response("CHANGE_REQUEST_ALREADY_ACTIVE", "A pending request for this specific field already exists.", 409);
    }
  } else {
    const active = await prisma.businessChangeRequest.findFirst({
      where: { businessId: parsed.data.businessId, submitterUserId: userId, kind: parsed.data.kind, status: "PENDING" },
      select: { id: true },
    });
    if (active) return response("CHANGE_REQUEST_ALREADY_ACTIVE", "A pending request of this type already exists.", 409, { id: active.id });
  }

  const created = await prisma.businessChangeRequest.create({
    data: {
      businessId: parsed.data.businessId,
      submitterUserId: userId,
      submitterRelation: parsed.data.submitterRelation,
      kind: parsed.data.kind,
      payload: payload as never,
      snapshot: snapshot as never,
      businessUpdatedAt: new Date(snapshot.updatedAt),
      additionalContext: parsed.data.additionalContext,
      evidenceUrl: parsed.data.evidenceUrl,
    },
    select: { id: true, status: true },
  });
  return NextResponse.json({ success: true, data: created }, { status: 201 });
}

function response(code: string, error: string, status: number, details?: unknown) {
  return NextResponse.json({ success: false, code, error, details }, { status });
}
