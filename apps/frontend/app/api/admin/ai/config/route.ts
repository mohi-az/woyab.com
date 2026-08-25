import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { authorizeAiAdminRequest } from "@/lib/ai/admin-auth";
import { AiConfigurationError } from "@/lib/ai/errors";
import { aiProviderConfigSchema, getPublicAiProviderConfigs, saveAiProviderConfig } from "@/lib/ai/config";

export async function GET() {
  const authorization = await authorizeAiAdminRequest();
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  return NextResponse.json({ configs: await getPublicAiProviderConfigs() });
}

export async function PUT(request: Request) {
  const authorization = await authorizeAiAdminRequest();
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });

  try {
    const input = aiProviderConfigSchema.parse(await request.json());
    await saveAiProviderConfig(input, authorization.user.id);
    revalidatePath("/admin/ai");
    return NextResponse.json({ configs: await getPublicAiProviderConfigs() });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid AI configuration." }, { status: 400 });
    }
    if (error instanceof AiConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to save AI provider configuration", error);
    return NextResponse.json({ error: "The AI configuration could not be saved." }, { status: 500 });
  }
}
