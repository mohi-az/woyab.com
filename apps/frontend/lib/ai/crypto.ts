import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { AiConfigurationError } from "@/lib/ai/errors";

function encryptionSecret() {
  const secret = process.env.AI_CONFIG_ENCRYPTION_KEY?.trim();
  if (!secret || secret.length < 32) {
    throw new AiConfigurationError("AI_CONFIG_ENCRYPTION_KEY must contain at least 32 characters.");
  }
  return createHash("sha256").update(secret).digest();
}

export function isAiEncryptionConfigured() {
  return (process.env.AI_CONFIG_ENCRYPTION_KEY?.trim().length ?? 0) >= 32;
}

export function encryptAiApiKey(apiKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionSecret(), iv);
  const encrypted = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), authTag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptAiApiKey(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new AiConfigurationError("The stored AI API key has an invalid format.");
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionSecret(), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new AiConfigurationError("The AI API key could not be decrypted. Check AI_CONFIG_ENCRYPTION_KEY.");
  }
}

export function apiKeyHint(apiKey: string) {
  const visible = apiKey.slice(-4);
  return visible ? `••••${visible}` : null;
}
