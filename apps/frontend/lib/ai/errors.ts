import type { AiProvider } from "@/lib/ai/types";

export class AiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigurationError";
  }
}

export class AiProviderError extends Error {
  constructor(
    public readonly provider: AiProvider,
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}
