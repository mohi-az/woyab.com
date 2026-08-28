import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const carouselPath = new URL("../features/home/CityCarousel.tsx", import.meta.url);

test("city carousel shows two cards on mobile", async () => {
  const source = await readFile(carouselPath, "utf8");

  assert.match(source, /else setPerPage\(2\)/);
  assert.doesNotMatch(source, /setPerPage\(1\)/);
  assert.match(source, /grid min-w-full grid-cols-2/);
  assert.match(source, /\(max-width: 767px\) 50vw/);
});

test("city carousel exposes manual controls below desktop width", async () => {
  const source = await readFile(carouselPath, "utf8");

  assert.match(source, /mt-4 flex items-center justify-center gap-3 xl:hidden/);
  assert.match(source, /onClick=\{\(\) => move\(-1\)\}/);
  assert.match(source, /onClick=\{\(\) => move\(1\)\}/);
  assert.match(source, /\{safePage \+ 1\} \/ \{pages\.length\}/);
  assert.match(source, /touch-pan-y/);
  assert.match(source, /onPointerCancel/);
});
