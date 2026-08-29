import { NextResponse } from "next/server";
import { createBusinessDetails, updateBusinessDetails } from "@/lib/admin-actions";
import { authorizeAiAdminRequest } from "@/lib/ai/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authorization = await authorizeAiAdminRequest();
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });

  try {
    await createBusinessDetails(await request.formData());
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The business could not be created." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await updateBusinessDetails(await request.formData());
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The business could not be updated." },
      { status: 400 },
    );
  }
}
