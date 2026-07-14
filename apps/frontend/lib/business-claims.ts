import "server-only";

import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { resolve4, resolve6, resolveMx } from "node:dns/promises";
import { sendMail } from "@/lib/mail";

export const claimOtpMaxAgeMs = 10 * 60_000;
export const claimOtpBlockMs = 10 * 60_000;
export const claimOtpResendCooldownMs = 60_000;
export const claimOtpWindowMs = 30 * 60_000;
export const claimOtpMaxSendsPerWindow = 3;
export function claimPrivacyNoticeVersion() {
  const version = process.env.CLAIM_PRIVACY_NOTICE_VERSION?.trim();
  if (!version && process.env.NODE_ENV === "production") throw new Error("CLAIM_PRIVACY_NOTICE_VERSION is required.");
  return version || "development-draft";
}

export function claimTermsVersion() {
  const version = process.env.CLAIM_TERMS_VERSION?.trim();
  if (!version && process.env.NODE_ENV === "production") throw new Error("CLAIM_TERMS_VERSION is required.");
  return version || "development-draft";
}

function otpSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is required for claim OTPs.");
  return secret || "fargo-local-development-claim-secret";
}

export function createClaimOtp() {
  const code = String(randomInt(100_000, 1_000_000));
  const claimId = randomUUID();
  return {
    claimId,
    code,
    hash: hashClaimOtp(claimId, code),
    expiresAt: new Date(Date.now() + claimOtpMaxAgeMs),
  };
}

export function hashClaimOtp(claimId: string, code: string) {
  return createHmac("sha256", otpSecret()).update(`${claimId}:${code}`).digest("hex");
}

export function claimOtpMatches(expectedHash: string, claimId: string, code: string) {
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(hashClaimOtp(claimId, code), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function hasDeliverableEmailDomain(email: string) {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  if (!domain) return false;

  try {
    const mx = await resolveMx(domain);
    if (mx.length) return true;
  } catch (error) {
    if (!isMissingDnsRecord(error)) throw error;
  }

  const addresses = await Promise.allSettled([resolve4(domain), resolve6(domain)]);
  if (addresses.some((result) => result.status === "fulfilled" && result.value.length > 0)) return true;
  const transientFailure = addresses.find((result) => result.status === "rejected" && !isMissingDnsRecord(result.reason));
  if (transientFailure?.status === "rejected") throw transientFailure.reason;
  return false;
}

function isMissingDnsRecord(error: unknown) {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === "ENODATA" || code === "ENOTFOUND" || code === "ENOENT";
}

export async function sendBusinessClaimOtp(input: {
  to: string;
  businessName: string;
  claimantName: string;
  code: string;
}) {
  const warning = "If you are not the owner of this business, ignore this email.";
  const escapedBusiness = escapeHtml(input.businessName);
  const escapedClaimant = escapeHtml(input.claimantName);
  const escapedCode = escapeHtml(input.code);

  await sendMail({
    to: input.to,
    subject: `Fargo ownership verification for ${input.businessName}`,
    text: [
      `Business: ${input.businessName}`,
      `Requested by: ${input.claimantName}`,
      `Verification code: ${input.code}`,
      "This one-time code expires in 10 minutes.",
      warning,
    ].join("\n\n"),
    html: `<h1>Verify business ownership</h1><p><strong>Business:</strong> ${escapedBusiness}</p><p><strong>Requested by:</strong> ${escapedClaimant}</p><p style="font-size:28px;font-weight:800;letter-spacing:6px">${escapedCode}</p><p>This one-time code expires in 10 minutes.</p><p><strong>${warning}</strong></p>`,
  });
}

export function claimRetentionDate(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60_000);
}

export function ownershipRetentionDate(endedAt: Date) {
  return new Date(Date.UTC(endedAt.getUTCFullYear() + 3, 11, 31, 23, 59, 59, 999));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}
