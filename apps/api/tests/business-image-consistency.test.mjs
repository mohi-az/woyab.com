import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

async function frontendSource(relativePath) {
  return readFile(new URL(`../../frontend/${relativePath}`, import.meta.url), "utf8");
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
  assert.match(adminActions, /createBusinessDetails[\s\S]*resolvePermanentBusinessCover/);
  assert.match(adminActions, /updateBusinessDetails[\s\S]*resolvePermanentBusinessCover/);
  assert.match(ownerActions, /createOwnerBusiness[\s\S]*resolvePermanentBusinessCover/);
  assert.match(changeRequests, /applyBusinessChangeRequest[\s\S]*resolvePermanentBusinessCover/);
});

test("business lists use only permanent covers while details keep Google photos on demand", async () => {
  const api = await frontendSource("lib/api.ts");

  const cardResolver = api.match(/function businessCardImageProps[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(cardResolver, /business\.coverImageUrl/);
  assert.doesNotMatch(cardResolver, /google-photo-thumbnail/);
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
