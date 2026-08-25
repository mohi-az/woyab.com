import "server-only";

import type { AiProvider as DatabaseAiProvider } from "@woyab/database";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiKeyHint, decryptAiApiKey, encryptAiApiKey } from "@/lib/ai/crypto";
import { AiConfigurationError } from "@/lib/ai/errors";
import { aiProviders, type AiProvider, type PublicAiProviderConfig } from "@/lib/ai/types";

export const defaultAiProviderConfig = {
  enabled: false,
  isDefault: false,
  model: null,
  systemPrompt: null,
  temperature: null,
  maxOutputTokens: 2048,
  timeoutMs: 30_000,
} as const;

export const aiProviderConfigSchema = z.object({
  provider: z.enum(aiProviders),
  enabled: z.boolean(),
  isDefault: z.boolean(),
  apiKey: z.string().trim().max(4096).optional(),
  clearApiKey: z.boolean().optional().default(false),
  model: z.string().trim().max(200).nullable(),
  systemPrompt: z.string().trim().max(12_000).nullable(),
  temperature: z.number().min(0).max(2).nullable(),
  maxOutputTokens: z.number().int().min(1).max(131_072),
  timeoutMs: z.number().int().min(1_000).max(120_000),
}).superRefine((input, context) => {
  if (input.clearApiKey && input.apiKey) {
    context.addIssue({ code: "custom", path: ["apiKey"], message: "Choose either a replacement API key or removal of the stored key." });
  }
  if (input.isDefault && !input.enabled) {
    context.addIssue({ code: "custom", path: ["isDefault"], message: "The default provider must be enabled." });
  }
  if (input.enabled && !input.model) {
    context.addIssue({ code: "custom", path: ["model"], message: "Choose a model before enabling this provider." });
  }
});

function databaseProvider(provider: AiProvider) {
  return provider as DatabaseAiProvider;
}

export async function getPublicAiProviderConfigs(): Promise<PublicAiProviderConfig[]> {
  const rows = await prisma.aiProviderConfig.findMany({ orderBy: { provider: "asc" } });
  const byProvider = new Map(rows.map((row) => [row.provider, row]));

  return aiProviders.map((provider) => {
    const row = byProvider.get(databaseProvider(provider));
    return {
      provider,
      enabled: row?.enabled ?? defaultAiProviderConfig.enabled,
      isDefault: row?.isDefault ?? defaultAiProviderConfig.isDefault,
      hasApiKey: Boolean(row?.apiKeyEncrypted),
      apiKeyHint: row?.apiKeyHint ?? null,
      model: row?.model ?? defaultAiProviderConfig.model,
      systemPrompt: row?.systemPrompt ?? defaultAiProviderConfig.systemPrompt,
      temperature: row?.temperature ?? defaultAiProviderConfig.temperature,
      maxOutputTokens: row?.maxOutputTokens ?? defaultAiProviderConfig.maxOutputTokens,
      timeoutMs: row?.timeoutMs ?? defaultAiProviderConfig.timeoutMs,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    };
  });
}

export async function getAiApiKey(provider: AiProvider) {
  const row = await prisma.aiProviderConfig.findUnique({
    where: { provider: databaseProvider(provider) },
    select: { apiKeyEncrypted: true },
  });
  if (!row?.apiKeyEncrypted) throw new AiConfigurationError(`No API key is configured for ${provider}.`);
  return decryptAiApiKey(row.apiKeyEncrypted);
}

export async function resolveAiApiKey(provider: AiProvider, transientApiKey?: string) {
  return transientApiKey?.trim() || getAiApiKey(provider);
}

export async function saveAiProviderConfig(input: z.infer<typeof aiProviderConfigSchema>, actorId: string) {
  const existing = await prisma.aiProviderConfig.findUnique({
    where: { provider: databaseProvider(input.provider) },
    select: { apiKeyEncrypted: true },
  });
  const hasKeyAfterSave = input.clearApiKey ? false : Boolean(input.apiKey || existing?.apiKeyEncrypted);
  if (input.enabled && !hasKeyAfterSave) throw new AiConfigurationError("Add an API key before enabling this provider.");

  const encryptedApiKey = input.apiKey ? encryptAiApiKey(input.apiKey) : undefined;
  const data = {
    enabled: input.enabled,
    isDefault: input.isDefault,
    model: input.model || null,
    systemPrompt: input.systemPrompt || null,
    temperature: input.temperature,
    maxOutputTokens: input.maxOutputTokens,
    timeoutMs: input.timeoutMs,
    updatedById: actorId,
    ...(input.clearApiKey
      ? { apiKeyEncrypted: null, apiKeyHint: null }
      : encryptedApiKey
        ? { apiKeyEncrypted: encryptedApiKey, apiKeyHint: apiKeyHint(input.apiKey!) }
        : {}),
  };

  await prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.aiProviderConfig.updateMany({
        where: { isDefault: true, provider: { not: databaseProvider(input.provider) } },
        data: { isDefault: false },
      });
    }
    await tx.aiProviderConfig.upsert({
      where: { provider: databaseProvider(input.provider) },
      update: data,
      create: { provider: databaseProvider(input.provider), ...data },
    });
    await tx.adminAuditLog.create({
      data: {
        actorId,
        action: "ai.provider.update",
        entityType: "AiProviderConfig",
        entityId: input.provider,
        metadata: {
          provider: input.provider,
          enabled: input.enabled,
          isDefault: input.isDefault,
          model: input.model,
          apiKeyChanged: Boolean(input.apiKey),
          apiKeyCleared: input.clearApiKey,
        },
      },
    });
  });
}
