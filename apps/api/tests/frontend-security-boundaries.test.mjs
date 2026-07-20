import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

async function frontendSource(relativePath) {
  return readFile(new URL(`../../frontend/${relativePath}`, import.meta.url), "utf8");
}

test("privileged admin operations require SUPER_ADMIN", async () => {
  const [auth, actions, settingsPage, retentionPage, auditPage] = await Promise.all([
    frontendSource("lib/admin-auth.ts"),
    frontendSource("lib/admin-actions.ts"),
    frontendSource("app/admin/settings/page.tsx"),
    frontendSource("app/admin/retention/page.tsx"),
    frontendSource("app/admin/audit/page.tsx"),
  ]);
  assert.match(auth, /requireSuperAdmin/);
  assert.match(actions, /updateUserAccess[\s\S]*?requireSuperAdmin\(\)/);
  assert.match(actions, /reviewRetentionItem[\s\S]*?requireSuperAdmin\(\)/);
  assert.match(actions, /updateAdminSetting[\s\S]*?requireSuperAdmin\(\)/);
  assert.match(settingsPage, /requireSuperAdmin\(\)/);
  assert.match(retentionPage, /requireSuperAdmin\(\)/);
  assert.match(auditPage, /requireSuperAdmin\(\)/);
});

test("private panels are never stored by middleware or the service worker", async () => {
  const [middleware, serviceWorker] = await Promise.all([
    frontendSource("middleware.ts"),
    frontendSource("public/sw.js"),
  ]);
  for (const prefix of ["/admin", "/dashboard", "/business-portal"]) {
    assert.match(middleware, new RegExp(prefix.replace("/", "\\/")));
    assert.match(serviceWorker, new RegExp(prefix.replace("/", "\\/")));
  }
  assert.match(middleware, /private, no-store, no-cache/);
  assert.match(serviceWorker, /if \(isPrivatePath\(url\.pathname\)\)/);
  assert.match(serviceWorker, /privateNetworkOnly/);
});

test("authenticated Google proxy routes send the server-only internal credential", async () => {
  const [photo, photos, proxy] = await Promise.all([
    frontendSource("app/api/place-photo/route.ts"),
    frontendSource("app/api/place-photos/[placeId]/route.ts"),
    frontendSource("lib/server-api.ts"),
  ]);
  for (const route of [photo, photos]) {
    assert.match(route, /currentUserId\(\)/);
    assert.match(route, /isRateLimited/);
    assert.match(route, /\{ internal: true \}/);
  }
  assert.match(photo, /placeId/);
  assert.match(proxy, /x-fargo-internal-secret/);
  assert.doesNotMatch(proxy, /NEXT_PUBLIC_INTERNAL/);
});

test("public Next.js surfaces use ACTIVE businesses and APPROVED reviews", async () => {
  const [sitemap, reviews, reports] = await Promise.all([
    frontendSource("app/sitemap.ts"),
    frontendSource("app/api/businesses/[businessId]/reviews/route.ts"),
    frontendSource("app/api/directory-reports/route.ts"),
  ]);
  assert.match(sitemap, /status: "ACTIVE"/);
  assert.match(reviews, /status: "ACTIVE"/);
  assert.match(reports, /status: "APPROVED"/);
  assert.match(reports, /status: "ACTIVE"/);
});
