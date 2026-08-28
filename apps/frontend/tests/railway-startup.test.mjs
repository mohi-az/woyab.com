import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packagePath = new URL("../package.json", import.meta.url);
const healthPath = new URL("../app/api/health/route.ts", import.meta.url);

test("frontend startup does not block on database migrations", async () => {
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));

  assert.equal(packageJson.scripts.start, "next start");
  assert.match(packageJson.scripts["db:migrate:deploy"], /db:migrate:deploy/);
});

test("frontend exposes an uncached Railway healthcheck", async () => {
  const source = await readFile(healthPath, "utf8");

  assert.match(source, /status: "ok"/);
  assert.match(source, /service: "frontend"/);
  assert.match(source, /Cache-Control/);
  assert.match(source, /no-store/);
});
