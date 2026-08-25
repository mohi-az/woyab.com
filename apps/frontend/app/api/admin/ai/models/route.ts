import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { authorizeAiAdminRequest } from "@/lib/ai/admin-auth";
import { AiConfigurationError, AiProviderError } from "@/lib/ai/errors";
import { listAiModels } from "@/lib/ai/service";
import { aiProviders } from "@/lib/ai/types";

const requestSchema = z.object({
  provider: z.enum(aiProviders),
  apiKey: z.string().trim().max(4096).optional(),
  timeoutMs: z.number().int().min(1_000).max(120_000).optional(),
});

export async function POST(request: Request) {
  const authorization = await authorizeAiAdminRequest();
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });

  try {
    const input = requestSchema.parse(await request.json());
    const models = await listAiModels(input.provider, input.apiKey, input.timeoutMs);
    return NextResponse.json({ models });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid model request." }, { status: 400 });
    }
    if (error instanceof AiConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof AiProviderError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status && error.status < 500 ? 400 : 502 });
    }
    console.error("Failed to load AI models", error);
    return NextResponse.json({ error: "Models could not be loaded from the provider." }, { status: 500 });
  }
}
