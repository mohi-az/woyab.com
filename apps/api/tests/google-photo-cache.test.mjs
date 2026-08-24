import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

const serviceUrl = new URL("../src/modules/businesses/google-places.service.ts", import.meta.url);

test("Google Places photo binaries use a width-aware 31-day server cache", async () => {
  const service = await readFile(serviceUrl, "utf8");

  assert.match(service, /PHOTO_CACHE_TTL_MS = 31 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(service, /\.cache["',\s]+"google-place-photos"/);
  assert.match(service, /env\.GOOGLE_PHOTO_CACHE_DIR/);
  assert.match(service, /\.update\(photoReference\)[\s\S]*\.update\(String\(maxWidth\)\)/);
  assert.match(service, /readCachedPhoto\(cacheKey\)/);
  assert.match(service, /writeCachedPhoto\(cacheKey, result\)/);
  assert.match(service, /readCachedPlacePhotoList\(placeId\)/);
  assert.match(service, /writeCachedPlacePhotoList\(placeId, entry\)/);
});

test("concurrent requests for the same photo share one Google request", async () => {
  const service = await readFile(serviceUrl, "utf8");

  assert.match(service, /photoRequestsInFlight\.get\(cacheKey\)/);
  assert.match(service, /photoRequestsInFlight\.set\(cacheKey, request\)/);
  assert.match(service, /photoRequestsInFlight\.delete\(cacheKey\)/);
  assert.match(service, /placePhotoListsInFlight\.get\(placeId\)/);
  assert.match(service, /placePhotoListsInFlight\.set\(placeId, request\)/);
});
