import { env } from "../../config/env.js";
import { logger } from "../../logger/logger.js";

export const DEFAULT_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MAX_BATCH_SIZE = 100; // Gemini API allows at most 100 requests per batchEmbedContents

type GeminiEmbeddingObject = {
  values?: number[];
};

type GeminiEmbedResponse = {
  embedding?: GeminiEmbeddingObject;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type GeminiBatchEmbedResponse = {
  embeddings?: GeminiEmbeddingObject[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

function resolveApiKey(explicitKey?: string): string {
  const key = explicitKey || env.GEMINI_EMBEDDING_API_KEY || process.env.GEMINI_EMBEDDING_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_EMBEDDING_API_KEY is not configured. Please define it in your environment or .env file.",
    );
  }
  return key;
}

function normalizeModelName(modelName: string): { fullModelPath: string; urlEndpointName: string } {
  const clean = modelName.replace(/^models\//, "");
  return {
    fullModelPath: `models/${clean}`,
    urlEndpointName: clean,
  };
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let attempt = 0;
  let delay = 4000;

  while (attempt <= maxRetries) {
    const response = await fetch(url, options);

    if (response.status === 429 && attempt < maxRetries) {
      attempt++;
      logger.warn(
        { attempt, delayMs: delay },
        "Rate limit (429) hit from Gemini API. Backing off before retry...",
      );
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
      continue;
    }

    return response;
  }

  return fetch(url, options);
}

/**
 * Generates a 768-dimensional embedding vector for indexing a business document.
 * Uses taskType: "RETRIEVAL_DOCUMENT" which optimizes vector representations for stored knowledge.
 */
export async function embedDocument(
  text: string,
  apiKey?: string,
  modelName: string = DEFAULT_EMBEDDING_MODEL,
): Promise<number[]> {
  const key = resolveApiKey(apiKey);
  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error("Cannot generate embedding for empty document text");
  }

  const { fullModelPath, urlEndpointName } = normalizeModelName(modelName);
  const url = `${API_BASE}/models/${urlEndpointName}:embedContent`;

  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify({
      model: fullModelPath,
      content: {
        parts: [{ text: cleanText }],
      },
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const rawError = await response.text();
    let errorMessage = rawError;
    try {
      const parsed = JSON.parse(rawError) as GeminiEmbedResponse;
      if (parsed.error?.message) {
        errorMessage = parsed.error.message;
      }
    } catch {
      // Fallback to raw text
    }
    logger.error({ status: response.status, error: errorMessage }, "Gemini embedContent failed");
    throw new Error(`Gemini embedDocument failed (${response.status}): ${errorMessage}`);
  }

  const data = (await response.json()) as GeminiEmbedResponse;
  const values = data.embedding?.values;
  if (!values || values.length === 0) {
    throw new Error("Gemini returned empty embedding values");
  }

  return values;
}

/**
 * Generates an embedding vector for a search query.
 * Uses taskType: "RETRIEVAL_QUERY" which optimizes representations for matching against indexed documents.
 */
export async function embedQuery(
  text: string,
  apiKey?: string,
  modelName: string = DEFAULT_EMBEDDING_MODEL,
): Promise<number[]> {
  const key = resolveApiKey(apiKey);
  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error("Cannot generate embedding for empty search query");
  }

  const { fullModelPath, urlEndpointName } = normalizeModelName(modelName);
  const url = `${API_BASE}/models/${urlEndpointName}:embedContent`;

  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify({
      model: fullModelPath,
      content: {
        parts: [{ text: cleanText }],
      },
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const rawError = await response.text();
    let errorMessage = rawError;
    try {
      const parsed = JSON.parse(rawError) as GeminiEmbedResponse;
      if (parsed.error?.message) {
        errorMessage = parsed.error.message;
      }
    } catch {
      // Fallback
    }
    logger.error({ status: response.status, error: errorMessage }, "Gemini query embed failed");
    throw new Error(`Gemini embedQuery failed (${response.status}): ${errorMessage}`);
  }

  const data = (await response.json()) as GeminiEmbedResponse;
  const values = data.embedding?.values;
  if (!values || values.length === 0) {
    throw new Error("Gemini returned empty embedding values for query");
  }

  return values;
}

/**
 * Embeds a batch of document texts efficiently using the batchEmbedContents API.
 * Automatically slices into sub-batches if texts count exceeds Gemini's 100-request limit.
 */
export async function embedDocumentBatch(
  texts: string[],
  apiKey?: string,
  modelName: string = DEFAULT_EMBEDDING_MODEL,
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const key = resolveApiKey(apiKey);
  const { fullModelPath, urlEndpointName } = normalizeModelName(modelName);
  const url = `${API_BASE}/models/${urlEndpointName}:batchEmbedContents`;

  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const chunk = texts.slice(i, i + MAX_BATCH_SIZE);
    const requests = chunk.map((text) => ({
      model: fullModelPath,
      content: {
        parts: [{ text: text.trim() || " " }],
      },
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: EMBEDDING_DIMENSIONS,
    }));

    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      const rawError = await response.text();
      let errorMessage = rawError;
      try {
        const parsed = JSON.parse(rawError) as GeminiBatchEmbedResponse;
        if (parsed.error?.message) {
          errorMessage = parsed.error.message;
        }
      } catch {
        // Fallback
      }
      logger.error(
        { status: response.status, batchOffset: i, chunkSize: chunk.length, error: errorMessage },
        "Gemini batchEmbedContents failed",
      );
      throw new Error(`Gemini batch embedding failed (${response.status}): ${errorMessage}`);
    }

    const data = (await response.json()) as GeminiBatchEmbedResponse;
    const embeddings = data.embeddings ?? [];

    for (let j = 0; j < chunk.length; j++) {
      const vals = embeddings[j]?.values;
      if (!vals || vals.length === 0) {
        throw new Error(`Gemini returned empty embedding at index ${i + j} in batch`);
      }
      allEmbeddings.push(vals);
    }
  }

  return allEmbeddings;
}
