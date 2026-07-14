import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

async function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("the public Express business and service routers expose no write handlers", async () => {
  const [businessRoute, serviceRoute] = await Promise.all([
    source("src/modules/businesses/business.route.ts"),
    source("src/modules/services/service.route.ts"),
  ]);
  assert.doesNotMatch(businessRoute, /businessRouter\.(patch|delete)\(/);
  assert.doesNotMatch(businessRoute, /businessRouter\.post\("\/"/);
  assert.doesNotMatch(serviceRoute, /serviceRouter\.(post|patch|delete)\(/);
});

test("all public business discovery paths exclude soft-removed records", async () => {
  const [repository, mapRepository, searchRepository, googlePhotos] = await Promise.all([
    source("src/modules/businesses/business.repository.ts"),
    source("src/modules/businesses/business-map.repository.ts"),
    source("src/modules/businesses/business-search.repository.ts"),
    source("src/modules/businesses/google-places.route.ts"),
  ]);
  assert.match(repository, /removedAt: null/);
  assert.match(mapRepository, /b\."removedAt" IS NULL/);
  assert.match(searchRepository, /b\."removedAt" IS NULL/);
  assert.doesNotMatch(googlePhotos, /googlePlacesRouter\.get\("\/google-photos/);
  assert.match(googlePhotos, /where: \{ id, removedAt: null \}/);
});
