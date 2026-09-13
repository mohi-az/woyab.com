import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const revision = "a".repeat(40);
const routeSource = await readFile(new URL("../app/api/ready/route.ts", import.meta.url), "utf8");
const apiSource = await readFile(new URL("../../api/src/routes/health.route.ts", import.meta.url), "utf8");

function compile(source, imports, extras = {}) {
  const exports = {};
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("exports", "require", "process", "fetch", "setTimeout", "clearTimeout", code)(
    exports, name => {
      assert.ok(name in imports, `Unexpected import: ${name}`);
      return imports[name];
    }, { env: { APP_REVISION: revision, API_URL: "http://api:4000/" } },
    extras.fetch ?? (() => { throw new Error("Unexpected network access"); }),
    extras.setTimeout ?? setTimeout, clearTimeout,
  );
  return exports;
}

function frontend({ db = async () => null, apiRevision = revision, apiStatus = 200, timer } = {}) {
  return compile(routeSource, { "@/lib/prisma": { prisma: { category: { findFirst: db } } } }, {
    setTimeout: timer,
    fetch: async (url, options) => {
      assert.equal(url, "http://api:4000/v1/ready");
      assert.equal(options.cache, "no-store");
      return Response.json({ status: "ok", service: "api", revision: apiRevision }, { status: apiStatus });
    },
  });
}

test("frontend readiness checks Neon and the exact paired API revision without caching", async () => {
  let reads = 0;
  const route = frontend({ db: async query => {
    reads++;
    assert.deepEqual(query, { select: { id: true, nameDe: true, active: true } });
    return null;
  } });
  const response = await route.GET();
  assert.equal(reads, 1);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.deepEqual(await response.json(), { status: "ok", service: "frontend", revision });
});

test("frontend readiness fails closed for DB errors, wrong API revision and unavailable API", async () => {
  for (const options of [
    { db: async () => { throw new Error("postgres://secret-password"); } },
    { apiRevision: "b".repeat(40) }, { apiStatus: 503 },
  ]) {
    const response = await frontend(options).GET();
    assert.equal(response.status, 503);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.deepEqual(await response.json(), { status: "unavailable", service: "frontend" });
  }
});

test("frontend readiness bounds stalled DB reads", async () => {
  const response = await frontend({ db: () => new Promise(() => {}), timer: callback => setTimeout(callback, 0) }).GET();
  assert.equal(response.status, 503);
});

function api(db) {
  const handlers = {};
  compile(apiSource, {
    express: { Router: () => ({ get: (path, handler) => { handlers[path] = handler; } }) },
    "../config/env.js": { env: { APP_REVISION: revision, APP_NAME: "test", API_VERSION: "v1" } },
    "../lib/prisma.js": { prisma: { category: { findFirst: db } } },
  });
  return handlers;
}

function responseRecorder() {
  return {
    code: 200, headers: {}, body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("API liveness remains independent from DB while readiness requires a real read", async () => {
  let reads = 0;
  const handlers = api(async () => { reads++; return null; });
  const live = responseRecorder();
  handlers["/health"]({}, live);
  assert.equal(reads, 0);
  assert.equal(live.body.data.revision, revision);
  const ready = responseRecorder();
  await handlers["/ready"]({}, ready);
  assert.equal(reads, 1);
  assert.deepEqual(ready.body, { status: "ok", service: "api", revision });
  assert.match(ready.headers["Cache-Control"], /no-store/);
});

test("API readiness never returns private DB error details", async () => {
  const handlers = api(async () => { throw new Error("postgres://secret-password"); });
  const response = responseRecorder();
  await handlers["/ready"]({}, response);
  assert.equal(response.code, 503);
  assert.deepEqual(response.body, { status: "unavailable", service: "api" });
});
