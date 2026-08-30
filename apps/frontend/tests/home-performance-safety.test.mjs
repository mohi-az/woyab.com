import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the home page does not preload the hidden not-found illustration", async () => {
  const notFound = await source("app/not-found.tsx");

  assert.match(notFound, /src="\/images\/404-illustration\.png"/);
  assert.doesNotMatch(notFound, /fetchPriority="high"/);
  assert.match(notFound, /loading="lazy"/);
  assert.match(notFound, /decoding="async"/);
});

test("latest business media loads only for visible or requested carousel pages", async () => {
  const carousel = await source("features/home/LatestBusinessesCarousel.tsx");

  assert.match(carousel, /loadedPageIndexes/);
  assert.match(carousel, /pageIndex === safeActivePage \|\| loadedPageIndexes\.has\(pageIndex\)/);
  assert.match(carousel, /imageUrl=\{shouldLoadPageMedia \? item\.imageUrl : null\}/);
  assert.match(carousel, /onMouseEnter=\{\(\) => markPageForLoading\(pageIndex\)\}/);
});

test("home card Google thumbnails are capped at 640 pixels", async () => {
  const homeData = await source("lib/home-data.ts");

  assert.match(homeData, /params\.set\("maxWidth", "640"\)/);
  assert.match(homeData, /homeCardImageUrl\(business\.coverImageUrl/);
});

test("language and install controls avoid nested or mismatched accessible names", async () => {
  const [languageSelector, installButton, installPrompt] = await Promise.all([
    source("components/i18n/LanguageSelector.tsx"),
    source("components/pwa/PwaInstallButton.tsx"),
    source("components/ServiceWorkerRegistration.tsx"),
  ]);

  assert.doesNotMatch(languageSelector, /<div tabIndex=\{0\} role="button">/);
  assert.match(languageSelector, /aria-label=\{`\$\{t\("label"\)\}: \$\{localeLabels\[activeLocale\]\}`\}/);
  assert.doesNotMatch(installButton, /aria-label=\{installed \? t\("installed"\) : t\("action"\)\}/);
  assert.doesNotMatch(installPrompt, /<aside\s+role="dialog"/);
});
