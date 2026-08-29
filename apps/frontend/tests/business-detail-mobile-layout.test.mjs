import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const detailPath = new URL("../features/businesses/BusinessDetailClient.tsx", import.meta.url);

test("mobile business details move reviews after the supporting cards", async () => {
  const source = await readFile(detailPath, "utf8");

  assert.match(source, /className="contents md:block md:space-y-8"/);
  assert.match(source, /id="reviews" className="order-\[99\][^"]*md:order-none"/);
  assert.match(source, /<aside className="contents md:flex md:flex-col md:gap-6">/);
});

test("duplicate stats are removed and the standalone hours card stays desktop-only", async () => {
  const source = await readFile(detailPath, "utf8");

  assert.doesNotMatch(source, /stats\.(?:googleRating|category|subCategory)/);
  assert.match(source, /className="order-4 hidden rounded-\[30px\][^"]*md:block"/);
});

test("mobile opening hours use an outside-click dropdown in the hero", async () => {
  const source = await readFile(detailPath, "utf8");

  assert.match(source, /mobileHoursRef/);
  assert.match(source, /document\.addEventListener\("pointerdown", closeOnOutsidePointer\)/);
  assert.match(source, /className="relative md:hidden"/);
  assert.match(source, /aria-expanded=\{mobileHoursOpen\}/);
  assert.match(source, /z-20[^\"]*overflow-visible[^\"]*md:z-auto md:overflow-hidden/);
  assert.match(source, /max-h-\[min\(28rem,calc\(100dvh-12rem\)\)\][^\"]*overflow-y-auto/);
});
