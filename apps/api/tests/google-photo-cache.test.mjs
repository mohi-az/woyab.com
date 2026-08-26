import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

const serviceUrl = new URL("../src/modules/businesses/google-places.service.ts", import.meta.url);
const geoRouteUrl = new URL("../src/modules/geo/geo.route.ts", import.meta.url);
const aiModalUrl = new URL("../../frontend/components/admin/AiBusinessImportModal.tsx", import.meta.url);
const placeImportUrl = new URL("../../frontend/components/admin/GooglePlaceImport.tsx", import.meta.url);

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
  assert.match(service, /placePhotoListsInFlight\.get\(requestKey\)/);
  assert.match(service, /placePhotoListsInFlight\.set\(requestKey, request\)/);
});

test("failed cached photo references refresh once without removing the 31-day cache", async () => {
  const [service, geoRoute] = await Promise.all([
    readFile(serviceUrl, "utf8"),
    readFile(geoRouteUrl, "utf8"),
  ]);

  assert.match(
    service,
    /fetchAndCachePlacePhotos\([\s\S]*placeId: string,[\s\S]*forceRefresh = false,[\s\S]*\)/,
  );
  assert.match(service, /if \(!forceRefresh\) \{[\s\S]*readCachedPlacePhotoList\(placeId\)/);
  assert.match(service, /getPlacePhotos\(placeId, \{ forceRefresh: true \}\)/);
  assert.match(service, /export async function getFirstPlacePhotoBuffer/);
  assert.match(service, /export async function getPlacePhotoBuffer/);
  assert.match(geoRoute, /getPlacePhotoBuffer\(placeId, ref, maxWidth\)/);
});

test("Google photo quota errors stay visible and admin previews load photos on demand", async () => {
  const [service, aiModal, placeImport] = await Promise.all([
    readFile(serviceUrl, "utf8"),
    readFile(aiModalUrl, "utf8"),
    readFile(placeImportUrl, "utf8"),
  ]);

  assert.match(service, /Google Places photo quota is exhausted/);
  assert.match(service, /if \(error instanceof ApiError\) throw error/);
  assert.match(aiModal, /MAX_GOOGLE_PHOTO_PREVIEWS = 4/);
  assert.match(aiModal, /googlePhotos\.slice\(0, MAX_GOOGLE_PHOTO_PREVIEWS\)/);
  assert.match(placeImport, /place\.photos\.slice\(0, MAX_GOOGLE_PHOTO_PREVIEWS\)/);
});
