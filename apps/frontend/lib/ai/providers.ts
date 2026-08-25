import "server-only";

import { AiProviderError } from "@/lib/ai/errors";
import type { AiGenerationResult, AiModel, AiProvider } from "@/lib/ai/types";

type ProviderGenerationInput = {
  apiKey: string;
  model: string;
  prompt: string;
  systemPrompt?: string | null;
  temperature?: number | null;
  maxOutputTokens: number;
  timeoutMs: number;
  structuredOutput?: {
    name: string;
    schema: Record<string, unknown>;
  };
};

type ErrorPayload = {
  error?: { message?: string; code?: string | number; status?: string };
};

async function providerFetch(provider: AiProvider, url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, cache: "no-store", signal: controller.signal });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as ErrorPayload | null;
      const message = payload?.error?.message || `${provider} returned HTTP ${response.status}.`;
      const code = payload?.error?.code ?? payload?.error?.status;
      throw new AiProviderError(provider, message, response.status, code === undefined ? undefined : String(code));
    }
    return response;
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AiProviderError(provider, `${provider} did not respond within ${timeoutMs} ms.`, 504, "TIMEOUT");
    }
    throw new AiProviderError(provider, error instanceof Error ? error.message : `${provider} request failed.`);
  } finally {
    clearTimeout(timeout);
  }
}

function isLikelyOpenAiTextModel(id: string) {
  const excluded = [
    "embedding", "moderation", "whisper", "transcribe", "tts", "dall-e", "image", "realtime", "audio",
  ];
  return !excluded.some((segment) => id.toLowerCase().includes(segment));
}

export async function listOpenAiModels(apiKey: string, timeoutMs = 15_000): Promise<AiModel[]> {
  const response = await providerFetch("OPENAI", "https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  }, timeoutMs);
  const payload = await response.json() as { data?: Array<{ id?: string }> };
  return (payload.data ?? [])
    .flatMap((model) => model.id && isLikelyOpenAiTextModel(model.id) ? [{ id: model.id, name: model.id }] : [])
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function listGeminiModels(apiKey: string, timeoutMs = 15_000): Promise<AiModel[]> {
  const response = await providerFetch("GEMINI", "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", {
    headers: { "x-goog-api-key": apiKey },
  }, timeoutMs);
  const payload = await response.json() as {
    models?: Array<{
      name?: string;
      displayName?: string;
      description?: string;
      inputTokenLimit?: number;
      outputTokenLimit?: number;
      supportedGenerationMethods?: string[];
      supportedActions?: string[];
    }>;
  };

  return (payload.models ?? [])
    .filter((model) => {
      const methods = model.supportedGenerationMethods ?? model.supportedActions ?? [];
      return methods.length === 0 || methods.includes("generateContent");
    })
    .flatMap((model) => {
      const id = model.name?.replace(/^models\//, "");
      return id ? [{
        id,
        name: model.displayName || id,
        description: model.description,
        inputTokenLimit: model.inputTokenLimit,
        outputTokenLimit: model.outputTokenLimit,
      }] : [];
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function listProviderModels(provider: AiProvider, apiKey: string, timeoutMs?: number) {
  return provider === "OPENAI"
    ? listOpenAiModels(apiKey, timeoutMs)
    : listGeminiModels(apiKey, timeoutMs);
}

function openAiOutputText(payload: {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
}) {
  if (payload.output_text) return payload.output_text;
  return (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" && item.text)
    .map((item) => item.text)
    .join("\n");
}

export async function generateWithOpenAi(input: ProviderGenerationInput): Promise<AiGenerationResult> {
  const body: Record<string, unknown> = {
    model: input.model,
    input: input.prompt,
    max_output_tokens: input.maxOutputTokens,
    store: false,
  };
  if (input.systemPrompt) body.instructions = input.systemPrompt;
  if (input.temperature !== null && input.temperature !== undefined) body.temperature = input.temperature;
  if (input.structuredOutput) {
    body.text = {
      format: {
        type: "json_schema",
        name: input.structuredOutput.name,
        strict: true,
        schema: input.structuredOutput.schema,
      },
    };
  }

  const response = await providerFetch("OPENAI", "https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, input.timeoutMs);
  const payload = await response.json() as {
    id?: string;
    model?: string;
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
  };
  const text = openAiOutputText(payload);
  if (!text) throw new AiProviderError("OPENAI", "OpenAI returned no text output.", 502, "EMPTY_OUTPUT");
  return {
    provider: "OPENAI",
    model: payload.model || input.model,
    text,
    requestId: payload.id,
    inputTokens: payload.usage?.input_tokens,
    outputTokens: payload.usage?.output_tokens,
    totalTokens: payload.usage?.total_tokens,
  };
}

export async function generateWithGemini(input: ProviderGenerationInput): Promise<AiGenerationResult> {
  const generationConfig: Record<string, unknown> = { maxOutputTokens: input.maxOutputTokens };
  if (input.temperature !== null && input.temperature !== undefined) generationConfig.temperature = input.temperature;
  if (input.structuredOutput) {
    generationConfig.responseFormat = {
      text: {
        mimeType: "application/json",
        schema: input.structuredOutput.schema,
      },
    };
  }
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: input.prompt }] }],
    generationConfig,
  };
  if (input.systemPrompt) body.systemInstruction = { parts: [{ text: input.systemPrompt }] };

  const model = input.model.replace(/^models\//, "");
  const response = await providerFetch(
    "GEMINI",
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": input.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    input.timeoutMs,
  );
  const payload = await response.json() as {
    modelVersion?: string;
    responseId?: string;
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  };
  const text = (payload.candidates ?? [])
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("");
  if (!text) throw new AiProviderError("GEMINI", "Gemini returned no text output.", 502, "EMPTY_OUTPUT");
  return {
    provider: "GEMINI",
    model: payload.modelVersion || model,
    text,
    requestId: payload.responseId,
    inputTokens: payload.usageMetadata?.promptTokenCount,
    outputTokens: payload.usageMetadata?.candidatesTokenCount,
    totalTokens: payload.usageMetadata?.totalTokenCount,
  };
}

export async function generateWithProvider(provider: AiProvider, input: ProviderGenerationInput) {
  return provider === "OPENAI" ? generateWithOpenAi(input) : generateWithGemini(input);
}
