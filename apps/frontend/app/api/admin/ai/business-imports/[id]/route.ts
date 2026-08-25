import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAiAdminRequest } from "@/lib/ai/admin-auth";
import {
  discardAiBusinessImport,
  getAiBusinessImport,
  retryAiBusinessImport,
  saveAiBusinessImportReviewState,
} from "@/lib/ai/business-import-service";

type Context = { params: Promise<{ id: string }> };
const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("retry") }),
  z.object({ action: z.literal("review"), state: z.record(z.string(), z.unknown()) }),
]);

export async function GET(_request: Request, { params }: Context) {
  const authorization = await authorizeAiAdminRequest();
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  const draft = await getAiBusinessImport((await params).id, authorization.user.id);
  if (!draft) return NextResponse.json({ error: "AI business draft was not found." }, { status: 404 });
  return NextResponse.json({ draft });
}

export async function PATCH(request: Request, { params }: Context) {
  const authorization = await authorizeAiAdminRequest();
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid AI draft update." }, { status: 400 });
  const { id } = await params;
  try {
    if (parsed.data.action === "retry") {
      return NextResponse.json({ draft: await retryAiBusinessImport(id, authorization.user.id) });
    }
    await saveAiBusinessImportReviewState(id, authorization.user.id, parsed.data.state);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI draft could not be updated." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const authorization = await authorizeAiAdminRequest();
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  try {
    await discardAiBusinessImport((await params).id, authorization.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI draft could not be discarded." }, { status: 400 });
  }
}
