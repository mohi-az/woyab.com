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

test("the public taxonomy and location routers expose no mutation handlers", async () => {
  const routes = await Promise.all([
    source("src/modules/categories/category.route.ts"),
    source("src/modules/locations/location.route.ts"),
    source("src/modules/tags/tag.route.ts"),
  ]);
  for (const route of routes) {
    assert.doesNotMatch(route, /\.(post|put|patch|delete)\(/);
  }
});

test("all public business discovery paths require ACTIVE, verified, non-removed records", async () => {
  const [repository, mapRepository, searchRepository, googlePhotos, hoursRepository] = await Promise.all([
    source("src/modules/businesses/business.repository.ts"),
    source("src/modules/businesses/business-map.repository.ts"),
    source("src/modules/businesses/business-search.repository.ts"),
    source("src/modules/businesses/google-places.route.ts"),
    source("src/modules/businesses/business-hours.repository.ts"),
  ]);
  assert.match(repository, /removedAt: null/);
  assert.match(mapRepository, /b\."removedAt" IS NULL/);
  assert.match(mapRepository, /b\."status" = 'ACTIVE'/);
  assert.match(mapRepository, /b\."verified" = TRUE/);
  assert.match(searchRepository, /b\."removedAt" IS NULL/);
  assert.match(searchRepository, /b\."status" = 'ACTIVE'/);
  assert.match(searchRepository, /b\."verified" = TRUE/);
  assert.match(hoursRepository, /b\."verified" = TRUE/);
  assert.doesNotMatch(googlePhotos, /googlePlacesRouter\.get\("\/google-photos/);
  assert.match(repository, /removedAt: null, status: "ACTIVE"/);
  assert.match(repository, /removedAt: null, status: "ACTIVE", verified: true/);
  assert.match(googlePhotos, /removedAt: null, status: "ACTIVE"/);
  assert.match(googlePhotos, /removedAt: null, status: "ACTIVE", verified: true/);
});

test("public review reads expose only approved reviews on active businesses", async () => {
  const [repository, schema] = await Promise.all([
    source("src/modules/reviews/review.repository.ts"),
    source("src/modules/reviews/review.schema.ts"),
  ]);
  assert.match(repository, /status: "APPROVED"/);
  assert.match(repository, /business: \{ removedAt: null, status: "ACTIVE" \}/);
  assert.doesNotMatch(schema, /listReviewsQuerySchema[\s\S]*PENDING/);
});

test("public business and owner-reply payloads do not select owner identity", async () => {
  const [businessRepository, businessService, reviewRepository] = await Promise.all([
    source("src/modules/businesses/business.repository.ts"),
    source("src/modules/businesses/business.service.ts"),
    source("src/modules/reviews/review.repository.ts"),
  ]);
  assert.doesNotMatch(businessRepository, /owner:\s*\{\s*select:/);
  assert.match(businessService, /ownerId,[\s\S]*hasOwner: Boolean\(ownerId\)/);
  assert.doesNotMatch(reviewRepository, /owner:\s*\{\s*select:/);
});

test("costly unbound Google endpoints require an internal secret and rate limiting", async () => {
  const [geoRoute, googleRoute] = await Promise.all([
    source("src/modules/geo/geo.route.ts"),
    source("src/modules/businesses/google-places.route.ts"),
  ]);
  assert.match(geoRoute, /place-photos\/:placeId", requireInternalApi, internalGoogleRateLimit/);
  assert.match(geoRoute, /place-photo", requireInternalApi, internalGoogleRateLimit/);
  assert.match(googleRoute, /googlePlacesRateLimit/);
});
