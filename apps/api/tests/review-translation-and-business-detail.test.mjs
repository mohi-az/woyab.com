import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { URL } from "node:url";

const root = new URL("../../../", import.meta.url);

async function source(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("review and owner-reply translations have persisted locale, retry, and lease state", async () => {
  const [schema, migration] = await Promise.all([
    source("packages/database/prisma/schema/review.prisma"),
    source("packages/database/prisma/migrations/20260826140000_add_review_translations/migration.sql"),
  ]);

  for (const status of ["NOT_REQUESTED", "PENDING", "PROCESSING", "PARTIAL", "READY", "FAILED"]) {
    assert.match(schema, new RegExp(`\\b${status}\\b`));
    assert.match(migration, new RegExp(`'${status}'`));
  }
  assert.match(schema, /@@unique\(\[reviewId, locale\]\)/);
  assert.match(schema, /@@unique\(\[ownerReplyId, locale\]\)/);
  assert.match(schema, /onDelete: Cascade/);
  assert.match(schema, /translationLeaseExpiresAt\s+DateTime\?/);
  assert.match(schema, /translationAttemptCount\s+Int\s+@default\(0\)/);
});

test("Google Basic v2 translation is server-only, NMT-backed, bounded, and key-safe", async () => {
  const [service, client, env] = await Promise.all([
    source("apps/frontend/lib/review-translations.ts"),
    source("apps/frontend/lib/google-cloud-translation.ts"),
    source("apps/frontend/.env.example"),
  ]);

  assert.match(service, /import "server-only"/);
  assert.match(client, /translation\.googleapis\.com\/language\/translate\/v2/);
  assert.match(client, /"X-Goog-Api-Key": apiKey/);
  assert.match(client, /model: "nmt"/);
  assert.match(client, /timeoutMs \?\? 12_000/);
  assert.match(client, /controller\.abort/);
  assert.match(service, /const MAX_ATTEMPTS = 5/);
  assert.match(service, /replace\(\/key=/);
  assert.doesNotMatch(`${service}${client}`, /console\.(log|error|warn)/);
  assert.match(env, /GOOGLE_CLOUD_TRANSLATION_API_KEY=""/);
});

test("Google translation client handles mocked detection, entities, API errors, and timeout", () => {
  const moduleUrl = new URL("apps/frontend/lib/google-cloud-translation.ts", root).href;
  const script = `
    const { translateGoogleValues } = await import(${JSON.stringify(moduleUrl)});
    let request;
    const successFetch = async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ data: { translations: [
        { translatedText: "Hello &amp; welcome", detectedSourceLanguage: "fa" },
        { translatedText: "Title", detectedSourceLanguage: "fa" }
      ] } }), { status: 200, headers: { "content-type": "application/json" } });
    };
    const result = await translateGoogleValues({ values: ["سلام", "عنوان"], target: "EN", apiKey: "test-key", fetchImpl: successFetch });
    if (result.sourceLanguageCode !== "fa" || result.values[0] !== "Hello & welcome") throw new Error("mock success mismatch");
    if (request.init.headers["X-Goog-Api-Key"] !== "test-key") throw new Error("missing API key header");
    const body = JSON.parse(request.init.body);
    if (body.model !== "nmt" || body.target !== "en" || body.q.length !== 2) throw new Error("invalid request body");

    const errorFetch = async () => new Response(JSON.stringify({ error: { message: "quota unavailable" } }), { status: 429, headers: { "content-type": "application/json" } });
    await translateGoogleValues({ values: ["x"], target: "DE", apiKey: "test-key", fetchImpl: errorFetch })
      .then(() => { throw new Error("expected API error"); }, (error) => { if (!error.message.includes("quota unavailable")) throw error; });

    const timeoutFetch = async (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => { const error = new Error("aborted"); error.name = "AbortError"; reject(error); });
    });
    await translateGoogleValues({ values: ["x"], target: "FA", apiKey: "test-key", timeoutMs: 5, fetchImpl: timeoutFetch })
      .then(() => { throw new Error("expected timeout"); }, (error) => { if (!error.message.includes("timed out")) throw error; });
  `;
  const result = spawnSync(process.execPath, ["--experimental-strip-types", "--conditions=react-server", "--input-type=module", "--eval", script], {
    cwd: new URL("apps/frontend/", root),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("language detection translates two supported targets or all three unsupported targets", async () => {
  const [service, client] = await Promise.all([
    source("apps/frontend/lib/review-translations.ts"),
    source("apps/frontend/lib/google-cloud-translation.ts"),
  ]);

  assert.match(service, /const CONTENT_LOCALES = \["DE", "EN", "FA"\]/);
  assert.match(client, /detectedSourceLanguage/);
  assert.match(service, /CONTENT_LOCALES\.filter\(\(locale\) => locale !== detectedLocale\)/);
  assert.match(service, /Promise\.allSettled/);
  assert.match(service, /translationStatus: ready \? "READY" : "PARTIAL"/);
  assert.match(service, /values = \[review\.comment, \.\.\.\(review\.title \? \[review\.title\] : \[\]\)\]/);
});

test("review moderation and owner replies queue translations without blocking persistence on translator errors", async () => {
  const [admin, owner, edit, create] = await Promise.all([
    source("apps/frontend/lib/admin-actions.ts"),
    source("apps/frontend/lib/owner-actions.ts"),
    source("apps/frontend/app/api/reviews/[reviewId]/route.ts"),
    source("apps/frontend/app/api/businesses/[businessId]/reviews/route.ts"),
  ]);

  assert.match(admin, /queueReviewTranslation\(tx, reviewId, status === "APPROVED" \? "PENDING" : "NOT_REQUESTED"\)/);
  assert.match(admin, /Promise\.allSettled/);
  assert.match(owner, /queueOwnerReplyTranslation/);
  assert.match(owner, /processOwnerReplyTranslation\(reply\.id\)\.catch/);
  assert.match(edit, /queueReviewTranslation\(tx, reviewId, "NOT_REQUESTED"\)/);
  assert.match(create, /sourceLanguageCode: sourceLocale \?\? null/);
});

test("translation maintenance is secret-protected and processes at most twenty jobs", async () => {
  const [route, service] = await Promise.all([
    source("apps/frontend/app/api/internal/review-translation-maintenance/route.ts"),
    source("apps/frontend/lib/review-translations.ts"),
  ]);

  assert.match(route, /process\.env\.CRON_SECRET/);
  assert.match(route, /authorization/);
  assert.match(route, /processPendingReviewTranslations\(20\)/);
  assert.match(service, /translationAttemptCount: \{ lt: MAX_ATTEMPTS \}/);
  assert.match(service, /translationLeaseExpiresAt: \{ lte: now \}/);
});

test("business detail hides empty WoYab stats and provides resilient map, gallery, ratings, and original-text controls", async () => {
  const [detail, gallery, map, data, ratings] = await Promise.all([
    source("apps/frontend/features/businesses/BusinessDetailClient.tsx"),
    source("apps/frontend/components/business/BusinessPhotoGallery.tsx"),
    source("apps/frontend/components/business/BusinessLocationMap.tsx"),
    source("apps/frontend/lib/business-detail-data.ts"),
    source("apps/frontend/components/ui/CircularRatingStars.tsx"),
  ]);

  assert.match(detail, /business\.reviewCount > 0/);
  assert.match(detail, /reviewsSection\.showOriginal/);
  assert.match(detail, /reviewsSection\.showTranslation/);
  assert.match(detail, /BusinessLocationMap/);
  assert.match(detail, /gallery\.showAll/);
  assert.doesNotMatch(detail, /activeImageIndex|setActiveImageIndex/);
  assert.match(gallery, /role="dialog"/);
  assert.match(gallery, /aria-modal="true"/);
  assert.match(gallery, /document\.body\.style\.overflow = "hidden"/);
  assert.match(gallery, /event\.key === "Escape"/);
  assert.match(gallery, /grid-cols-2/);
  assert.match(map, /map\.scrollZoom\.disable\(\)/);
  assert.match(map, /h-\[220px\].*sm:h-\[280px\]/);
  assert.match(map, /openstreetmap\.org\/export\/embed\.html/);
  assert.match(map, /window\.setTimeout\(showFallback, 10_000\)/);
  assert.doesNotMatch(map, /map\.once\("error"/);
  assert.match(data, /authorAttributions/);
  assert.match(data, /sourceUri: photo\.googleMapsUri/);
  assert.match(ratings, /precision = 0\.5/);
  assert.match(ratings, /safeFill \* 100/);
  assert.match(ratings, /fill=\{filled \? "#ff9f0a" : "#a3a3a3"\}/);
  assert.match(detail, /stats\.googleRating[\s\S]*CircularRatingStars rating=\{business\.googleRating\}/);
});

test("initial Google Place import no longer requests review bodies", async () => {
  const places = await source("apps/api/src/modules/businesses/google-places.service.ts");
  const mask = places.match(/const PLACE_IMPORT_FIELD_MASK = \[([\s\S]*?)\];/)?.[1] ?? "";
  assert.doesNotMatch(mask, /"reviews"/);
});
