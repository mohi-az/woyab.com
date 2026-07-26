import "server-only";

import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { resolve4, resolve6, resolveMx } from "node:dns/promises";
import { renderEmailCard } from "@/lib/email-templates";
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
  const html = renderEmailCard({
    badgeText: "کد تایید مالکیت",
    badgeBg: "#0f172a",
    title: `کد تایید احراز مالکیت`,
    subtitle: `سلام ${input.claimantName} عزیز،<br/>جهت ادامه فرآیند احراز مالکیت برای کسب‌وکار <strong>${input.businessName}</strong>، لطفاً کد ۶ رقمی زیر را در سیستم وارد نمایید:`,
    details: [
      { label: "کد ۶ رقمی تایید", value: input.code },
      { label: "مدت اعتبار", value: "۱۰ دقیقه" },
    ],
    footerNote: "اگر شما این درخواست را ثبت نکرده‌اید، می‌توانید این ایمیل را نادیده بگیرید.<br/><strong>تیم فارگو (Fargo Team)</strong>",
  });

  await sendMail({
    to: input.to,
    subject: `کد تایید احراز مالکیت کسب‌وکار ${input.businessName} | Fargo`,
    text: [
      `کسب‌وکار: ${input.businessName}`,
      `متقاضی: ${input.claimantName}`,
      `کد تایید ۶ رقمی: ${input.code}`,
      "این کد تا ۱۰ دقیقه معتبر است.",
    ].join("\n\n"),
    html,
  });
}

export async function sendBusinessClaimUnderReviewEmail(input: {
  to: string;
  businessName: string;
  claimantName: string;
  officialBusinessEmail: string;
}) {
  const html = renderEmailCard({
    badgeText: "در حال بررسی",
    badgeBg: "#f59e0b",
    title: `درخواست مالکیت شما دریافت شد`,
    subtitle: `سلام ${input.claimantName} عزیز،<br/>از ثبت درخواست شما برای مدیریت کسب‌وکار <strong>${input.businessName}</strong> سپاسگزاریم. ایمیل شما با موفقیت تایید شد و درخواست شما جهت بررسی نهایی به تیم پشتیبانی فارگو ارسال گردید.<br/><br/>اطلاعات ارسالی شما توسط کارشناسان بررسی خواهد شد و نتیجه آن به زودی از طریق همین ایمیل اطلاع‌رسانی می‌گردد.`,
    details: [
      { label: "نام کسب‌وکار", value: input.businessName },
      { label: "نام متقاضی", value: input.claimantName },
      { label: "ایمیل رسمی ثبت‌شده", value: input.officialBusinessEmail },
      { label: "وضعیت درخواست", value: "در انتظار بررسی توسط مدیران (Under Review)" },
    ],
    footerNote: "با تشکر از صبر و همکاری شما،<br/><strong>تیم پشتیبانی فارگو (Fargo Team)</strong>",
  });

  await sendMail({
    to: input.to,
    subject: `درخواست مالکیت کسب‌وکار ${input.businessName} ثبت شد | Fargo`,
    text: [
      `سلام ${input.claimantName} عزیز،`,
      `از ثبت درخواست شما برای مدیریت کسب‌وکار "${input.businessName}" سپاسگزاریم.`,
      `ایمیل شما تایید شد و درخواست جهت بررسی نهایی به تیم پشتیبانی فارگو ارسال گردید.`,
      `نتیجه بررسی به زودی به اطلاع شما خواهد رسید.`,
      `با تشکر، تیم فارگو`,
    ].join("\n\n"),
    html,
  });
}

export async function sendBusinessClaimApprovedEmail(input: {
  to: string;
  businessName: string;
  claimantName: string;
}) {
  const html = renderEmailCard({
    badgeText: "تایید شد",
    badgeBg: "#10b981",
    title: `تایید درخواست مالکیت کسب‌وکار`,
    subtitle: `سلام ${input.claimantName} عزیز،<br/>با خوشحالی به اطلاع می‌رسانیم که درخواست مالکیت شما برای کسب‌وکار <strong>${input.businessName}</strong> با موفقیت تایید شد.<br/><br/>اکنون دسترسی کامل پنل مدیریت این کسب‌وکار برای حساب شما فعال شده است.`,
    details: [
      { label: "نام کسب‌وکار", value: input.businessName },
      { label: "نام متقاضی", value: input.claimantName },
      { label: "وضعیت دسترسی", value: "فعال (Owner Access)" },
    ],
    footerNote: "با تشکر از همراهی شما،<br/><strong>تیم فارگو (Fargo Team)</strong>",
  });

  await sendMail({
    to: input.to,
    subject: `مالکیت کسب‌وکار ${input.businessName} تایید شد | Fargo`,
    text: [
      `سلام ${input.claimantName} عزیز،`,
      `درخواست مالکیت شما برای کسب‌وکار "${input.businessName}" تایید شد!`,
      "اکنون دسترسی مدیریت این صفحه برای شما فعال است.",
    ].join("\n\n"),
    html,
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
