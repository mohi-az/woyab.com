import "server-only";

import type { AiProvider as DatabaseAiProvider } from "@woyab/database";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { decryptAiApiKey, isAiEncryptionConfigured } from "@/lib/ai/crypto";
import { AiConfigurationError } from "@/lib/ai/errors";
import { generateWithProvider, listProviderModels } from "@/lib/ai/providers";
import { aiProviders, type AiGenerationRequest, type AiProvider, type AiStructuredGenerationRequest } from "@/lib/ai/types";

const generationSchema = z.object({
  prompt: z.string().trim().min(1).max(100_000),
  provider: z.enum(aiProviders).optional(),
  model: z.string().trim().min(1).max(200).optional(),
  systemPrompt: z.string().trim().max(12_000).nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  maxOutputTokens: z.number().int().min(1).max(131_072).optional(),
  timeoutMs: z.number().int().min(1_000).max(120_000).optional(),
});

function databaseProvider(provider: AiProvider) {
  return provider as DatabaseAiProvider;
}

export { isAiEncryptionConfigured };

export async function listAiModels(provider: AiProvider, transientApiKey?: string, timeoutMs = 15_000) {
  const apiKey = transientApiKey?.trim() || await loadApiKey(provider);
  return listProviderModels(provider, apiKey, timeoutMs);
}

export async function generateAiText(request: AiGenerationRequest) {
  const input = generationSchema.parse(request);
  const config = input.provider
    ? await prisma.aiProviderConfig.findUnique({ where: { provider: databaseProvider(input.provider) } })
    : await prisma.aiProviderConfig.findFirst({ where: { enabled: true, isDefault: true } });

  if (!config || !config.enabled) {
    throw new AiConfigurationError(input.provider
      ? `${input.provider} is not enabled.`
      : "No default AI provider is enabled.");
  }
  const provider = config.provider as AiProvider;
  const model = input.model || config.model;
  if (!model) throw new AiConfigurationError(`No model is configured for ${provider}.`);
  if (!config.apiKeyEncrypted) throw new AiConfigurationError(`No API key is configured for ${provider}.`);

  return generateWithProvider(provider, {
    apiKey: decryptAiApiKey(config.apiKeyEncrypted),
    model,
    prompt: input.prompt,
    systemPrompt: input.systemPrompt === undefined ? config.systemPrompt : input.systemPrompt,
    temperature: input.temperature === undefined ? config.temperature : input.temperature,
    maxOutputTokens: input.maxOutputTokens ?? config.maxOutputTokens,
    timeoutMs: input.timeoutMs ?? config.timeoutMs,
  });
}

export async function generateAiStructured(request: AiStructuredGenerationRequest) {
  const input = generationSchema.extend({
    schemaName: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
    jsonSchema: z.record(z.string(), z.unknown()),
  }).parse(request);
  const config = input.provider
    ? await prisma.aiProviderConfig.findUnique({ where: { provider: databaseProvider(input.provider) } })
    : await prisma.aiProviderConfig.findFirst({ where: { enabled: true, isDefault: true } });

  if (!config || !config.enabled) {
    throw new AiConfigurationError(input.provider
      ? `${input.provider} is not enabled.`
      : "No default AI provider is enabled.");
  }
  const provider = config.provider as AiProvider;
  const model = input.model || config.model;
  if (!model) throw new AiConfigurationError(`No model is configured for ${provider}.`);
  if (!config.apiKeyEncrypted) throw new AiConfigurationError(`No API key is configured for ${provider}.`);

  return generateWithProvider(provider, {
    apiKey: decryptAiApiKey(config.apiKeyEncrypted),
    model,
    prompt: input.prompt,
    systemPrompt: input.systemPrompt === undefined ? config.systemPrompt : input.systemPrompt,
    temperature: input.temperature === undefined ? config.temperature : input.temperature,
    maxOutputTokens: input.maxOutputTokens ?? config.maxOutputTokens,
    timeoutMs: input.timeoutMs ?? config.timeoutMs,
    structuredOutput: { name: input.schemaName, schema: input.jsonSchema },
  });
}

export async function testAiDraft(input: AiGenerationRequest & { apiKey?: string }) {
  const parsed = generationSchema.extend({ apiKey: z.string().trim().max(4096).optional() }).parse(input);
  if (!parsed.provider) throw new AiConfigurationError("Choose a provider to run a test.");
  if (!parsed.model) throw new AiConfigurationError("Choose a model to run a test.");
  const apiKey = parsed.apiKey || await loadApiKey(parsed.provider);
  return generateWithProvider(parsed.provider, {
    apiKey,
    model: parsed.model,
    prompt: parsed.prompt,
    systemPrompt: parsed.systemPrompt,
    temperature: parsed.temperature,
    maxOutputTokens: Math.min(parsed.maxOutputTokens ?? 512, 2048),
    timeoutMs: parsed.timeoutMs ?? 30_000,
  });
}

async function loadApiKey(provider: AiProvider) {
  const config = await prisma.aiProviderConfig.findUnique({
    where: { provider: databaseProvider(provider) },
    select: { apiKeyEncrypted: true },
  });
  if (!config?.apiKeyEncrypted) throw new AiConfigurationError(`No API key is configured for ${provider}.`);
  return decryptAiApiKey(config.apiKeyEncrypted);
}
