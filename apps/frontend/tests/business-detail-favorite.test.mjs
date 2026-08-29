import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const detailPath = new URL("../features/businesses/BusinessDetailClient.tsx", import.meta.url);
const favoritePath = new URL("../components/business/FavoriteButton.tsx", import.meta.url);

test("business detail places a hero favorite action opposite the back link", async () => {
  const source = await readFile(detailPath, "utf8");

  assert.match(source, /flex items-center justify-between gap-4/);
  assert.match(source, /<FavoriteButton[\s\S]*businessId=\{business\.id\}[\s\S]*variant="hero"/);
  assert.match(source, /favoriteAdd/);
  assert.match(source, /favoriteRemove/);
});

test("hero favorite action loads and toggles the account state", async () => {
  const source = await readFile(favoritePath, "utf8");

  assert.match(source, /fetch\("\/api\/account\/directory-context"/);
  assert.match(source, /favoriteBusinessIds\?\.includes\(businessId\)/);
  assert.match(source, /stripLocalePrefix\(pathname\)/);
  assert.match(source, /callbackUrl=\$\{encodeURIComponent\(callbackPath\)\}/);
  assert.match(source, /response\.status === 401\) router\.push\(loginHref\)/);
  assert.match(source, /aria-pressed=\{saved\}/);
  assert.match(source, /saved \? \(savedLabel \?\? label\) : label/);
  assert.match(source, /variant === "hero" \? "h-11 w-11 shrink-0/);
  assert.match(source, /lg:h-14 lg:w-14/);
});
