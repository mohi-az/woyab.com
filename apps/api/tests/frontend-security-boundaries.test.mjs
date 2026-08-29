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
  const [photo, photos, details, proxy] = await Promise.all([
    frontendSource("app/api/place-photo/route.ts"),
    frontendSource("app/api/place-photos/[placeId]/route.ts"),
    frontendSource("app/api/place-details/[placeId]/route.ts"),
    frontendSource("lib/server-api.ts"),
  ]);
  for (const route of [photo, photos]) {
    assert.match(route, /currentUserId\(\)/);
    assert.match(route, /isRateLimited/);
    assert.match(route, /\{ internal: true \}/);
  }
  assert.match(details, /currentUser\(\)/);
  assert.match(details, /isAdminRole/);
  assert.match(details, /twoFactorVerified/);
  assert.match(details, /isRateLimited/);
  assert.match(details, /\{ internal: true \}/);
  assert.match(photo, /placeId/);
  assert.match(proxy, /x-woyab-internal-secret/);
  assert.doesNotMatch(proxy, /NEXT_PUBLIC_INTERNAL/);
});

test("public business photo proxies authenticate the trusted frontend hop", async () => {
  const routes = await Promise.all([
    frontendSource("app/api/businesses/[businessId]/google-photos/route.ts"),
    frontendSource("app/api/businesses/[businessId]/google-photos/[...photoReference]/route.ts"),
    frontendSource("app/api/businesses/[businessId]/google-photo-thumbnail/route.ts"),
  ]);
  for (const route of routes) assert.match(route, /\{ internal: true \}/);
});

test("public Next.js surfaces use ACTIVE businesses and APPROVED reviews", async () => {
  const [sitemap, reviews, reports] = await Promise.all([
    frontendSource("app/sitemap.ts"),
    frontendSource("app/api/businesses/[businessId]/reviews/route.ts"),
    frontendSource("app/api/directory-reports/route.ts"),
  ]);
  assert.match(sitemap, /status: "ACTIVE"/);
  assert.match(sitemap, /verified: true/);
  assert.match(reviews, /status: "ACTIVE"/);
  assert.match(reports, /status: "APPROVED"/);
  assert.match(reports, /status: "ACTIVE"/);
});

test("password registration requires a single-use email verification", async () => {
  const [registration, auth, verification, migration] = await Promise.all([
    frontendSource("app/api/auth/register/route.ts"),
    frontendSource("auth.ts"),
    frontendSource("lib/email-verification.ts"),
    readFile(new URL("../../../packages/database/prisma/migrations/20260720190000_account_security_privacy/migration.sql", import.meta.url), "utf8"),
  ]);
  assert.match(registration, /sendAccountVerification/);
  assert.match(auth, /!user\.emailVerified/);
  assert.match(verification, /tokenHash/);
  assert.match(verification, /usedAt/);
  assert.match(migration, /email_verification_tokens/);
});

test("high-impact request routes use persistent anti-abuse limits", async () => {
  const paths = [
    "app/api/auth/register/route.ts",
    "app/api/auth/password-reset/request/route.ts",
    "app/api/directory-reports/route.ts",
    "app/api/support-tickets/route.ts",
    "app/api/business-claims/route.ts",
    "app/api/business-change-requests/route.ts",
  ];
  const routes = await Promise.all(paths.map(frontendSource));
  for (const route of routes) assert.match(route, /isPersistentlyRateLimited/);
});

test("account deletion supports true erasure or authorless anonymization", async () => {
  const [accountRoute, reviewSchema] = await Promise.all([
    frontendSource("app/api/account/route.ts"),
    readFile(new URL("../../../packages/database/prisma/schema/review.prisma", import.meta.url), "utf8"),
  ]);
  assert.match(accountRoute, /z\.enum\(\["ERASE", "ANONYMIZE"\]\)/);
  assert.match(accountRoute, /review\.deleteMany/);
  assert.match(accountRoute, /userId: null/);
  assert.match(accountRoute, /claimantName: "Anonymized"/);
  assert.match(accountRoute, /user\.delete/);
  assert.match(reviewSchema, /userId\s+String\?/);
});

test("the platform privacy policy is public and linked from the footer", async () => {
  const [policy, footer, sitemap] = await Promise.all([
    frontendSource("app/privacy/page.tsx"),
    frontendSource("components/layout/Footer.tsx"),
    frontendSource("app/sitemap.ts"),
  ]);
  assert.match(policy, /WoYab Privacy Policy/);
  assert.match(policy, /سیاست حریم خصوصی WoYab/);
  assert.match(policy, /Datenschutzerklärung von WoYab/);
  assert.match(footer, /href\("\/privacy"\)/);
  assert.match(sitemap, /"\/privacy"/);
});

test("final moderation decisions notify reporters and contributors", async () => {
  const [actions, emailTemplates] = await Promise.all([
    frontendSource("lib/admin-actions.ts"),
    frontendSource("lib/email-templates.ts"),
  ]);
  assert.match(actions, /report\.notification_failed/);
  assert.match(actions, /Your report about/);
  assert.match(actions, /WoYab report decision/);
  assert.match(actions, /The ownership claim for/);
  assert.match(actions, /Your change request for/);
  assert.match(emailTemplates, /Update on your review for/);
  assert.match(emailTemplates, /\| WoYab/);
});

test("administrator access requires encrypted TOTP enrollment and verification", async () => {
  const [auth, adminAuth, twoFactor, route, verifyRoute] = await Promise.all([
    frontendSource("auth.ts"),
    frontendSource("lib/admin-auth.ts"),
    frontendSource("lib/two-factor.ts"),
    frontendSource("app/api/admin/two-factor/route.ts"),
    frontendSource("app/api/auth/two-factor/verify/route.ts"),
  ]);
  assert.match(auth, /verifyTotp/);
  assert.match(auth, /twoFactorVerified/);
  assert.match(adminAuth, /twoFactorEnabledAt/);
  assert.match(adminAuth, /twoFactorVerified/);
  assert.match(adminAuth, /\/verify-2fa\?callbackUrl=\/admin/);
  assert.match(verifyRoute, /sessionUserId/);
  assert.match(twoFactor, /aes-256-gcm/);
  assert.match(route, /admin\.two_factor\.enabled/);
});

test("review authors can edit or delete only their own reviews", async () => {
  const [route, dashboard] = await Promise.all([
    frontendSource("app/api/reviews/[reviewId]/route.ts"),
    frontendSource("components/dashboard/ReviewManagementCard.tsx"),
  ]);
  assert.match(route, /currentUserId\(\)/);
  assert.match(route, /where: \{ id: reviewId, userId \}/);
  assert.match(route, /status: "PENDING"/);
  assert.match(route, /recalculatePublicBusinessRating/);
  assert.match(route, /tx\.review\.delete/);
  assert.match(dashboard, /method: "PATCH"/);
  assert.match(dashboard, /method: "DELETE"/);
});

test("helpful review votes are authenticated, unique, and cannot target the author", async () => {
  const [schema, route] = await Promise.all([
    readFile(new URL("../../../packages/database/prisma/schema/review.prisma", import.meta.url), "utf8"),
    frontendSource("app/api/reviews/[reviewId]/helpful/route.ts"),
  ]);
  assert.match(schema, /model ReviewHelpfulVote/);
  assert.match(schema, /@@unique\(\[reviewId, userId\]\)/);
  assert.match(route, /review\.userId === userId/);
  assert.match(route, /createMany/);
  assert.match(route, /skipDuplicates: true/);
  assert.match(route, /helpfulCount: \{ increment: 1 \}/);
});

test("open-now filtering and labels use registered hours in the Berlin time zone", async () => {
  const [hours, filters, directory, searchSchema, searchRepository] = await Promise.all([
    frontendSource("lib/business-hours.ts"),
    frontendSource("components/business/BusinessFilters.tsx"),
    frontendSource("features/businesses/BusinessDirectory.tsx"),
    readFile(new URL("../../../packages/shared/src/validators/location.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/modules/businesses/business-hours.repository.ts", import.meta.url), "utf8"),
  ]);
  assert.match(hours, /Europe\/Berlin/);
  assert.match(hours, /OPEN_SOON/);
  assert.match(hours, /CLOSE_SOON/);
  assert.match(`${filters}\n${directory}`, /filters\.openNow/);
  assert.match(searchSchema, /openNow: z\.boolean\(\)\.optional\(\)/);
  assert.match(searchRepository, /business_hours/);
  assert.match(searchRepository, /openTime.*closeTime/s);
});
