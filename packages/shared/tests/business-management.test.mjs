import assert from "node:assert/strict";
import test from "node:test";
import {
  businessClaimCreateSchema,
  claimResendDecision,
  claimVerificationDecision,
  otpFailureState,
} from "../dist/index.js";

test("claim input normalizes the business email and requires HTTPS evidence", () => {
  const parsed = businessClaimCreateSchema.parse({
    businessId: "business-1",
    claimantName: "Test Owner",
    officialBusinessEmail: " OWNER@EXAMPLE.COM ",
    officialUrl: "https://example.com/about",
    termsAccepted: true,
    privacyNoticeAccepted: true,
  });
  assert.equal(parsed.officialBusinessEmail, "owner@example.com");
  assert.equal(businessClaimCreateSchema.safeParse({ ...parsed, officialUrl: "http://example.com" }).success, false);
  assert.equal(businessClaimCreateSchema.safeParse({ ...parsed, termsAccepted: false }).success, false);
});

test("claim matrix only auto-approves an exact non-public email or matching domain for an unowned business", () => {
  assert.equal(claimVerificationDecision({ emailMatchesListing: true, officialBusinessEmail: "owner@example.com", hasOwner: false }), "APPROVED");
  assert.equal(claimVerificationDecision({ emailMatchesListing: false, officialBusinessEmail: "owner@example.com", hasOwner: false }), "UNDER_REVIEW");
  assert.equal(claimVerificationDecision({ emailMatchesListing: true, officialBusinessEmail: "owner@gmail.com", hasOwner: false }), "UNDER_REVIEW");
  assert.equal(claimVerificationDecision({ emailMatchesListing: true, officialBusinessEmail: "owner@gmx.de", hasOwner: false }), "UNDER_REVIEW");
  assert.equal(claimVerificationDecision({ emailMatchesListing: true, officialBusinessEmail: "owner@web.de", hasOwner: false }), "UNDER_REVIEW");
  assert.equal(claimVerificationDecision({ emailMatchesListing: true, officialBusinessEmail: "owner@example.com", hasOwner: true }), "UNDER_REVIEW");

  // Domain matching tests
  assert.equal(claimVerificationDecision({ emailMatchesListing: false, officialBusinessEmail: "manager@ali-cafe.de", businessWebsite: "https://www.ali-cafe.de", hasOwner: false }), "APPROVED");
  assert.equal(claimVerificationDecision({ emailMatchesListing: false, officialBusinessEmail: "info@fargo.com", businessWebsite: "fargo.com", hasOwner: false }), "APPROVED");
  assert.equal(claimVerificationDecision({ emailMatchesListing: false, officialBusinessEmail: "info@fargo.com", businessWebsite: "http://fargo.com/contact", hasOwner: false }), "APPROVED");
  assert.equal(claimVerificationDecision({ emailMatchesListing: false, officialBusinessEmail: "info@gmail.com", businessWebsite: "https://gmail.com", hasOwner: false }), "UNDER_REVIEW");
  assert.equal(claimVerificationDecision({ emailMatchesListing: false, officialBusinessEmail: "manager@ali-cafe.de", businessWebsite: "https://www.other.de", hasOwner: false }), "UNDER_REVIEW");
});

test("the third invalid OTP blocks verification for ten minutes", () => {
  const now = Date.UTC(2026, 6, 13);
  const state = otpFailureState(3, now, 10 * 60_000);
  assert.equal(state.attemptsRemaining, 0);
  assert.equal(state.blockedUntil?.getTime(), now + 10 * 60_000);
});

test("resend policy enforces cooldown and the rolling-window cap", () => {
  const base = { nowMs: 1_000_000, cooldownMs: 60_000, windowMs: 30 * 60_000, maxSends: 3 };
  assert.equal(claimResendDecision({ ...base, sentAtMs: base.nowMs - 10_000, windowStartedAtMs: base.nowMs - 100_000, sendCount: 1 }), "COOLDOWN");
  assert.equal(claimResendDecision({ ...base, sentAtMs: base.nowMs - 70_000, windowStartedAtMs: base.nowMs - 100_000, sendCount: 3 }), "LIMIT");
  assert.equal(claimResendDecision({ ...base, sentAtMs: base.nowMs - 70_000, windowStartedAtMs: base.nowMs - 100_000, sendCount: 2 }), "ALLOWED");
});
