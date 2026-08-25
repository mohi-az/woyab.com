import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAiAdminRequest } from "@/lib/ai/admin-auth";
import { createAiBusinessImport, listAiBusinessImports } from "@/lib/ai/business-import-service";
import { isPersistentlyRateLimited } from "@/lib/persistent-rate-limit";

const createSchema = z.object({ placeId: z.string().trim().min(8).max(255) });

export async function GET() {
  const authorization = await authorizeAiAdminRequest();
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  return NextResponse.json({ drafts: await listAiBusinessImports(authorization.user.id) });
}

export async function POST(request: Request) {
  const authorization = await authorizeAiAdminRequest();
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  if (await isPersistentlyRateLimited("ai-business-import-create", authorization.user.id, 10, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many AI business imports. Please try again later." }, { status: 429 });
  }
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid Google Place ID." }, { status: 400 });
  try {
    const draft = await createAiBusinessImport(parsed.data.placeId, authorization.user.id);
    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI business import could not be created." }, { status: 400 });
  }
}
