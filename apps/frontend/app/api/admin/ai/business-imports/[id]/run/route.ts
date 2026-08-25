import { NextResponse } from "next/server";
import { authorizeAiAdminRequest } from "@/lib/ai/admin-auth";
import { runAiBusinessImportStep } from "@/lib/ai/business-import-service";
import { isPersistentlyRateLimited } from "@/lib/persistent-rate-limit";

export const runtime = "nodejs";
export const maxDuration = 180;

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Context) {
  const authorization = await authorizeAiAdminRequest();
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  if (await isPersistentlyRateLimited("ai-business-import-run", authorization.user.id, 120, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many AI processing requests. Please try again later." }, { status: 429 });
  }
  try {
    const draft = await runAiBusinessImportStep((await params).id, authorization.user.id);
    return NextResponse.json({ draft });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI business import could not run." }, { status: 400 });
  }
}
