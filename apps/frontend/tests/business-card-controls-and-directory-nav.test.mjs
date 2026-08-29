import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("business cards keep favorites top-right and opening status top-left", async () => {
  const [card, favorite] = await Promise.all([
    source("components/business/BusinessCard.tsx"),
    source("components/business/FavoriteButton.tsx"),
  ]);

  assert.match(favorite, /absolute right-3 top-3 z-10/);
  assert.doesNotMatch(favorite, /top-14/);
  assert.match(favorite, /cursor-pointer/);
  assert.match(favorite, /saved \? "#ffffff" : "var\(--color-primary\)"/);
  assert.match(favorite, /fill=\{saved \? iconColor : "none"\}/);
  assert.match(favorite, /stroke=\{iconColor\}/);
  assert.match(favorite, /hover:bg-primary-dark/);
  assert.match(favorite, /hover:border-primary hover:bg-white hover:text-primary-dark/);
  assert.match(favorite, /observedInitialSaved !== initialSaved/);
  assert.match(favorite, /setSaved\(initialSaved\)/);
  assert.match(favorite, /const next = !saved;[\s\S]*setSaved\(next\);[\s\S]*onChange\?\.\(next\)/);
  assert.doesNotMatch(favorite, /setSaved\(\(value\) => \{[\s\S]*onChange/);
  assert.match(card, /absolute left-3 top-3/);
  assert.match(card, /openStatusLabel[\s\S]*featured === true/);
});

test("the businesses menu label links to the complete directory", async () => {
  const navbar = await source("components/layout/Navbar.tsx");

  assert.match(navbar, /<Link[\s\S]*?href="\/businesses"[\s\S]*?\{t\("nav\.businesses"\)\}[\s\S]*?<\/Link>/);
  assert.match(navbar, /aria-expanded=\{directoryMenuOpen\}/);
  assert.match(navbar, /aria-expanded=\{mobileDirectoryOpen\}/);
});
