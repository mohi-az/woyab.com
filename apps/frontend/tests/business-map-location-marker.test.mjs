import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const businessMapPath = new URL("../components/business/BusinessMap.tsx", import.meta.url);
const globalsPath = new URL("../app/globals.css", import.meta.url);

test("selected directory location creates and removes its own map marker", async () => {
  const source = await readFile(businessMapPath, "utf8");

  assert.match(source, /originMarkerRef\.current\?\.remove\(\)/);
  assert.match(source, /if \(!ready \|\| !mapRef\.current \|\| !mapboxRef\.current \|\| !location\) return/);
  assert.match(source, /className = "directory-origin-marker"/);
  assert.match(source, /setLngLat\(\[location\.longitude, location\.latitude\]\)/);
  assert.match(source, /mapRef\.current\.easeTo\(/);
});

test("directory location marker keeps Mapbox positioning and uses a blue dot", async () => {
  const css = await readFile(globalsPath, "utf8");
  const markerRule = css.match(/\.directory-origin-marker \{[\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(markerRule, /position: absolute/);
  assert.doesNotMatch(markerRule, /position: relative/);
  assert.match(css, /\.directory-origin-marker span \{[\s\S]*?background: #2563eb/);
});

test("non-fatal Mapbox errors after load do not replace a working map with an error message", async () => {
  const source = await readFile(businessMapPath, "utf8");

  assert.match(source, /let mapLoaded = false/);
  assert.match(source, /mapLoaded = true;[\s\S]*setError\(null\)/);
  assert.match(source, /map\.on\("error", \(\) => \{[\s\S]*if \(!mapLoaded && !cancelled\)/);
  assert.match(source, /if \(map\.getLayer\("business-points"\)\)/);
  assert.doesNotMatch(source, /map\.on\("error", \(\) => setError\(labels\.error\)\)/);
});
