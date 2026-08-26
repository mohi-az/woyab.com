import { z } from "zod";

const GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2";

const googleResponseSchema = z.object({
  data: z.object({
    translations: z.array(z.object({
      translatedText: z.string(),
      detectedSourceLanguage: z.string().optional(),
    })),
  }),
});

export type GoogleTranslationResult = {
  sourceLanguageCode: string | null;
  values: string[];
};

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = { amp: "&", apos: "'", gt: ">", lt: "<", quot: '"' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|apos|gt|lt|quot);/gi, (entity, code: string) => {
    if (code.startsWith("#x")) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    if (code.startsWith("#")) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    return named[code.toLowerCase()] ?? entity;
  });
}

export async function translateGoogleValues(options: {
  values: string[];
  target: "DE" | "EN" | "FA";
  apiKey?: string | null;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<GoogleTranslationResult> {
  const apiKey = options.apiKey?.trim() || process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY?.trim();
  if (!apiKey) throw new Error("Google Cloud Translation is not configured.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12_000);
  try {
    const response = await (options.fetchImpl ?? fetch)(GOOGLE_TRANSLATE_URL, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({ q: options.values, target: options.target.toLowerCase(), format: "text", model: "nmt" }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      throw new Error(payload?.error?.message || `Google Cloud Translation returned HTTP ${response.status}.`);
    }
    const parsed = googleResponseSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.data.translations.length !== options.values.length) {
      throw new Error("Google Cloud Translation returned an invalid response.");
    }
    return {
      sourceLanguageCode: parsed.data.data.translations[0]?.detectedSourceLanguage?.trim().toLowerCase().split(/[-_]/)[0] || null,
      values: parsed.data.data.translations.map((item) => decodeHtmlEntities(item.translatedText)),
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("Google Cloud Translation timed out.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
