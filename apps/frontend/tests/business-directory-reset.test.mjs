import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const directoryPath = new URL("../features/businesses/BusinessDirectory.tsx", import.meta.url);
const filtersPath = new URL("../components/business/BusinessFilters.tsx", import.meta.url);

test("clear filters removes filter criteria while preserving the current search area", async () => {
  const source = await readFile(directoryPath, "utf8");

  assert.doesNotMatch(source, /baseFilters/);
  assert.match(source, /setFilters\(\(current\) => \(\{/);
  assert.match(source, /page: 1,[\s\S]*limit: initialFilters\.limit,[\s\S]*sortBy: current\.sortBy \?\? "popular",[\s\S]*cityId: current\.cityId/);
  assert.match(source, /const hasClearableFilters = Boolean\(/);
  assert.doesNotMatch(source, /sessionStorage\.removeItem\("woyab:business-search-location"\)/);
  assert.doesNotMatch(source, /params\.set\("favoritesOnly"/);
  assert.doesNotMatch(source, /params\.set\("openNow"/);
  assert.match(source, /filters\.sortBy !== "popular"/);
});

test("clear filters is a conditional text action in the toolbar and drawer", async () => {
  const [directorySource, filtersSource] = await Promise.all([
    readFile(directoryPath, "utf8"),
    readFile(filtersPath, "utf8"),
  ]);

  assert.match(directorySource, /\{hasClearableFilters \? \(/);
  assert.match(directorySource, /showReset=\{hasClearableFilters\}/);
  assert.doesNotMatch(filtersSource, /inline-flex h-10 w-full/);
  assert.match(filtersSource, /hover:underline/);
});
