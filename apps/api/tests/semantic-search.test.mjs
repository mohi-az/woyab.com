import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

import {
  semanticSearchSchema,
  reindexSingleSchema,
  testSearchSchema,
} from "../dist/modules/embeddings/embedding.schema.js";

async function readApiSource(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("semanticSearchSchema validates query and optional filters", () => {
  // Valid full payload
  const valid = semanticSearchSchema.parse({
    query: "رستوران سنتی در برلین",
    locale: "fa",
    categoryId: 2,
    subCategoryId: 5,
    cityId: 10,
    tagIds: [1, 2, 3],
    limit: 15,
    minSimilarity: 0.4,
  });

  assert.equal(valid.query, "رستوران سنتی در برلین");
  assert.equal(valid.locale, "fa");
  assert.equal(valid.limit, 15);
  assert.equal(valid.minSimilarity, 0.4);

  // Comma-separated string for tagIds is parsed into numbers
  const parsedTags = semanticSearchSchema.parse({
    query: "تعمیرگاه",
    tagIds: "1, 2, 3",
  });
  assert.deepEqual(parsedTags.tagIds, [1, 2, 3]);

  // Defaults
  const minimal = semanticSearchSchema.parse({ query: "پزشک" });
  assert.equal(minimal.locale, "fa");
  assert.equal(minimal.limit, 20);
  assert.equal(minimal.minSimilarity, 0.6);

  // Empty query is rejected
  assert.throws(() => semanticSearchSchema.parse({ query: "   " }));
});

test("testSearchSchema and reindexSingleSchema enforce parameter constraints", () => {
  const validTest = testSearchSchema.parse({ query: "سوپرمارکت", limit: 5 });
  assert.equal(validTest.query, "سوپرمارکت");
  assert.equal(validTest.limit, 5);
  assert.equal(validTest.minSimilarity, 0.2);

  assert.throws(() => testSearchSchema.parse({ query: "" }));

  const validReindex = reindexSingleSchema.parse({ id: "biz_test_123" });
  assert.equal(validReindex.id, "biz_test_123");
  assert.throws(() => reindexSingleSchema.parse({ id: "" }));
});

test("embeddingRouter protects admin routes with requireInternalApi", async () => {
  const routeSource = await readApiSource("src/modules/embeddings/embedding.route.ts");

  assert.match(routeSource, /embeddingRouter\.post\("\/", asyncHandler\(embeddingController\.search\)\)/);
  assert.match(routeSource, /embeddingRouter\.post\("\/search", asyncHandler\(embeddingController\.search\)\)/);
  assert.match(routeSource, /embeddingRouter\.get\("\/stats", requireInternalApi,/);
  assert.match(routeSource, /embeddingRouter\.post\("\/index\/:id", requireInternalApi,/);
  assert.match(routeSource, /embeddingRouter\.post\("\/test", requireInternalApi,/);
});

test("app.ts mounts embeddingRouter under /v1/embeddings", async () => {
  const appSource = await readApiSource("src/app.ts");

  assert.match(appSource, /import\s*\{\s*embeddingRouter\s*\}\s*from\s*"\.\/modules\/embeddings\/embedding\.route\.js"/);
  assert.match(appSource, /app\.use\(`\$\{v\}\/embeddings`,\s*embeddingRouter\)/);
});

test("business.service.ts integrates semantic search with clean keyword fallback", async () => {
  const serviceSource = await readApiSource("src/modules/businesses/business.service.ts");

  assert.match(serviceSource, /import\s*\{\s*embeddingService\s*\}\s*from\s*"\.\.\/embeddings\/embedding\.service\.js"/);
  assert.match(serviceSource, /if\s*\(trimmedSearch\s*&&\s*embeddingService\.isAvailable\(\)\)/);
  assert.match(serviceSource, /embeddingService\.search\(\{/);
  assert.match(serviceSource, /logger\.warn\([\s\S]*falling back to keyword search/);
  assert.match(serviceSource, /return businessService\.list\(\{/);
});
