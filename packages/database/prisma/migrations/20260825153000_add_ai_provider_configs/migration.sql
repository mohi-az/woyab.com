CREATE TYPE "ai_provider" AS ENUM ('OPENAI', 'GEMINI');

CREATE TABLE "ai_provider_configs" (
  "provider" "ai_provider" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "apiKeyEncrypted" TEXT,
  "apiKeyHint" TEXT,
  "model" TEXT,
  "systemPrompt" TEXT,
  "temperature" DOUBLE PRECISION,
  "maxOutputTokens" INTEGER NOT NULL DEFAULT 2048,
  "timeoutMs" INTEGER NOT NULL DEFAULT 30000,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_provider_configs_pkey" PRIMARY KEY ("provider"),
  CONSTRAINT "ai_provider_configs_temperature_check" CHECK ("temperature" IS NULL OR ("temperature" >= 0 AND "temperature" <= 2)),
  CONSTRAINT "ai_provider_configs_max_output_tokens_check" CHECK ("maxOutputTokens" >= 1 AND "maxOutputTokens" <= 131072),
  CONSTRAINT "ai_provider_configs_timeout_ms_check" CHECK ("timeoutMs" >= 1000 AND "timeoutMs" <= 120000)
);

CREATE UNIQUE INDEX "ai_provider_configs_one_default"
  ON "ai_provider_configs" ("isDefault")
  WHERE "isDefault" = true;

CREATE INDEX "ai_provider_configs_updatedById_idx" ON "ai_provider_configs"("updatedById");

ALTER TABLE "ai_provider_configs"
  ADD CONSTRAINT "ai_provider_configs_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
