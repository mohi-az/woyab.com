export const aiProviders = ["OPENAI", "GEMINI"] as const;

export type AiProvider = (typeof aiProviders)[number];

export type AiModel = {
  id: string;
  name: string;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
};

export type AiGenerationOptions = {
  provider?: AiProvider;
  model?: string;
  systemPrompt?: string | null;
  temperature?: number | null;
  maxOutputTokens?: number;
  timeoutMs?: number;
};

export type AiGenerationRequest = AiGenerationOptions & {
  prompt: string;
};

export type AiStructuredGenerationRequest = AiGenerationRequest & {
  schemaName: string;
  jsonSchema: Record<string, unknown>;
};

export type AiGenerationResult = {
  provider: AiProvider;
  model: string;
  text: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  requestId?: string;
};

export type PublicAiProviderConfig = {
  provider: AiProvider;
  enabled: boolean;
  isDefault: boolean;
  hasApiKey: boolean;
  apiKeyHint: string | null;
  model: string | null;
  systemPrompt: string | null;
  temperature: number | null;
  maxOutputTokens: number;
  timeoutMs: number;
  updatedAt: string | null;
};

export type AiProviderDraft = Omit<PublicAiProviderConfig, "hasApiKey" | "apiKeyHint" | "updatedAt"> & {
  apiKey?: string;
};
