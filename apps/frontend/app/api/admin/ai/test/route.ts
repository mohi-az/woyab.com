import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { authorizeAiAdminRequest } from "@/lib/ai/admin-auth";
import { AiConfigurationError, AiProviderError } from "@/lib/ai/errors";
import { testAiDraft } from "@/lib/ai/service";
import { aiProviders } from "@/lib/ai/types";

const requestSchema = z.object({
  provider: z.enum(aiProviders),
  apiKey: z.string().trim().max(4096).optional(),
  model: z.string().trim().min(1).max(200),
  prompt: z.string().trim().min(1).max(2_000),
  systemPrompt: z.string().trim().max(12_000).nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  maxOutputTokens: z.number().int().min(1).max(131_072).optional(),
  timeoutMs: z.number().int().min(1_000).max(120_000).optional(),
});

export async function POST(request: Request) {
  const authorization = await authorizeAiAdminRequest();
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });

  try {
    const input = requestSchema.parse(await request.json());
    const result = await testAiDraft(input);
    await prismaAudit(authorization.user.id, input.provider, input.model, result.totalTokens);
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid test request." }, { status: 400 });
    }
    if (error instanceof AiConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof AiProviderError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status && error.status < 500 ? 400 : 502 });
    }
    console.error("Failed to test AI provider", error);
    return NextResponse.json({ error: "The AI test could not be completed." }, { status: 500 });
  }
}

async function prismaAudit(actorId: string, provider: string, model: string, totalTokens?: number) {
  const { prisma } = await import("@/lib/prisma");
  await prisma.adminAuditLog.create({
    data: {
      actorId,
      action: "ai.provider.test",
      entityType: "AiProviderConfig",
      entityId: provider,
      metadata: { provider, model, totalTokens: totalTokens ?? null },
    },
  });
}
