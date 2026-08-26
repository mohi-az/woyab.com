import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

async function frontendSource(relativePath) {
  return readFile(new URL(`../../frontend/${relativePath}`, import.meta.url), "utf8");
}

async function apiSource(relativePath) {
  return readFile(new URL(`../src/${relativePath}`, import.meta.url), "utf8");
}

test("admin and owner writes resolve covers through one permanent-image service", async () => {
  const [storage, adminActions, ownerActions, changeRequests] = await Promise.all([
    frontendSource("lib/business-image-storage.ts"),
    frontendSource("lib/admin-actions.ts"),
    frontendSource("lib/owner-actions.ts"),
    frontendSource("lib/business-change-requests.ts"),
  ]);

  assert.match(storage, /persistFirstGooglePlacePhoto/);
  assert.match(storage, /resolvePermanentBusinessCover/);
  assert.match(storage, /GOOGLE_COVER_WIDTH = 1_600/);
  assert.match(storage, /\/media\/businesses\//);
  assert.match(storage, /shouldRefreshRequestedGoogleCover/);
  assert.match(adminActions, /createBusinessDetails[\s\S]*resolvePermanentBusinessCover/);
  assert.match(adminActions, /updateBusinessDetails[\s\S]*resolvePermanentBusinessCover/);
  assert.match(ownerActions, /createOwnerBusiness[\s\S]*resolvePermanentBusinessCover/);
  assert.match(changeRequests, /applyBusinessChangeRequest[\s\S]*resolvePermanentBusinessCover/);
});

test("business lists prefer permanent covers while preserving a legacy fallback", async () => {
  const api = await frontendSource("lib/api.ts");

  const cardResolver = api.match(/function businessCardImageProps[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(cardResolver, /business\.coverImageUrl/);
  assert.match(cardResolver, /business\.coverImageUrl \|\| !business\.googlePlaceId/);
  assert.match(cardResolver, /Compatibility fallback/);
  assert.match(cardResolver, /google-photo-thumbnail/);
  assert.match(api, /index === 0 && business\.coverImageUrl/);
  assert.match(api, /google-photos\/\$\{photo\.photoReference\}\?maxWidth=800/);
});

test("manual uploads and stored Google covers share the protected image storage", async () => {
  const [uploadRoute, mediaRoute, imageManager] = await Promise.all([
    frontendSource("app/api/upload/route.ts"),
    frontendSource("app/media/businesses/[filename]/route.ts"),
    frontendSource("components/dashboard/BusinessImageManager.tsx"),
  ]);

  assert.match(uploadRoute, /storeBusinessImage/);
  assert.match(mediaRoute, /businessImageStoragePath/);
  assert.match(mediaRoute, /max-age=31536000, immutable/);
  assert.match(imageManager, /name="imageMode" value=\{imageMode\}/);
});

test("Google cover creation reuses the reviewed photo reference and never blocks business creation", async () => {
  const [storage, adminActions, geoRoute, placesService] = await Promise.all([
    frontendSource("lib/business-image-storage.ts"),
    frontendSource("lib/admin-actions.ts"),
    apiSource("modules/geo/geo.route.ts"),
    apiSource("modules/businesses/google-places.service.ts"),
  ]);

  assert.match(adminActions, /googlePhotoReference: nullableValue\(formData, "googlePhotoReference"\)/);
  assert.match(storage, /preferredPhotoReference/);
  assert.match(storage, /persistFirstGooglePlacePhoto\(input\.googlePlaceId, input\.googlePhotoReference\)[\s\S]*\.catch\(\(\) => existingCover/);
  assert.match(placesService, /photoReferenceBelongsToPlace/);
  assert.match(geoRoute, /photoReferenceBelongsToPlace\(ref, placeId\)/);
  assert.doesNotMatch(geoRoute.match(/geoRouter\.get\("\/place-photo"[\s\S]*?\n\}\);/)?.[0] ?? "", /getPlacePhotos\(placeId\)/);
});

test("admin editing persists galleries and business details recover Google photos without local files", async () => {
  const [adminPage, adminGrid, adminActions, detailData] = await Promise.all([
    frontendSource("app/admin/businesses/page.tsx"),
    frontendSource("components/admin/AdminBusinessGrid.tsx"),
    frontendSource("lib/admin-actions.ts"),
    frontendSource("lib/business-detail-data.ts"),
  ]);

  assert.match(adminPage, /images:\s*\{[\s\S]*orderBy:\s*\{ sortOrder: "asc" \}/);
  assert.match(adminGrid, /<BusinessImageManager/);
  assert.match(adminGrid, /businessWizard\.media/);
  assert.match(adminActions, /updateBusinessDetails[\s\S]*businessImage\.deleteMany/);
  assert.match(adminActions, /businessImage\.createMany/);
  assert.match(detailData, /isStoredGoogleCoverUrl/);
  assert.match(detailData, /google-photo-thumbnail\?maxWidth=1600/);
  assert.match(detailData, /\/google-photos\/\$\{photo\.photoReference/);
});
