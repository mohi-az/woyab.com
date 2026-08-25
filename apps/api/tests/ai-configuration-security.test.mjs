import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

const root = new URL("../../../", import.meta.url);

async function source(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("AI provider keys are encrypted and never exposed by public configuration", async () => {
  const [schema, migration, crypto, config] = await Promise.all([
    source("packages/database/prisma/schema/ai.prisma"),
    source("packages/database/prisma/migrations/20260825153000_add_ai_provider_configs/migration.sql"),
    source("apps/frontend/lib/ai/crypto.ts"),
    source("apps/frontend/lib/ai/config.ts"),
  ]);

  assert.match(schema, /apiKeyEncrypted\s+String\?/);
  assert.doesNotMatch(schema, /\n\s+apiKey\s+String/);
  assert.match(migration, /ai_provider_configs_one_default/);
  assert.match(crypto, /aes-256-gcm/);
  assert.match(crypto, /AI_CONFIG_ENCRYPTION_KEY/);
  assert.match(config, /hasApiKey: Boolean\(row\?\.apiKeyEncrypted\)/);
  assert.doesNotMatch(config, /apiKey:\s*decryptAiApiKey/);
});

test("AI administration routes require a verified super-admin", async () => {
  const [authorization, configRoute, modelsRoute, testRoute] = await Promise.all([
    source("apps/frontend/lib/ai/admin-auth.ts"),
    source("apps/frontend/app/api/admin/ai/config/route.ts"),
    source("apps/frontend/app/api/admin/ai/models/route.ts"),
    source("apps/frontend/app/api/admin/ai/test/route.ts"),
  ]);

  assert.match(authorization, /user\.role !== "SUPER_ADMIN"/);
  assert.match(authorization, /twoFactorEnabledAt/);
  assert.match(authorization, /twoFactorVerified/);
  for (const route of [configRoute, modelsRoute, testRoute]) {
    assert.match(route, /authorizeAiAdminRequest\(\)/);
  }
});

test("shared AI generation disables OpenAI response storage and resolves only enabled configuration", async () => {
  const [providers, service] = await Promise.all([
    source("apps/frontend/lib/ai/providers.ts"),
    source("apps/frontend/lib/ai/service.ts"),
  ]);

  assert.match(providers, /store: false/);
  assert.match(providers, /x-goog-api-key/);
  assert.match(providers, /type: "json_schema"/);
  assert.match(providers, /responseMimeType/);
  assert.match(providers, /responseJsonSchema/);
  assert.match(service, /where: \{ enabled: true, isDefault: true \}/);
  assert.match(service, /decryptAiApiKey/);
});
