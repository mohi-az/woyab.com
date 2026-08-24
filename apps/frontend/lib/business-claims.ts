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
  return secret || "woyab-local-development-claim-secret";
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
    footerNote: "اگر شما این درخواست را ثبت نکرده‌اید، می‌توانید این ایمیل را نادیده بگیرید.<br/><strong>تیم woYab (woYab Team)</strong>",
  });

  await sendMail({
    to: input.to,
    subject: `کد تایید احراز مالکیت کسب‌وکار ${input.businessName} | woYab`,
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
  locale?: string;
}) {
  const isDe = input.locale?.toLowerCase().startsWith("de");
  const isEn = input.locale?.toLowerCase().startsWith("en");
  const isFa = !isDe && !isEn;

  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://woyab.ir"}/${input.locale || "fa"}/business-portal`;

  let badgeText = "در حال بررسی";
  let title = "درخواست مالکیت شما دریافت شد";
  let subtitle = `سلام ${input.claimantName} عزیز،<br/>از ثبت درخواست شما برای مدیریت کسب‌وکار <strong>${input.businessName}</strong> سپاسگزاریم. ایمیل شما با موفقیت تایید شد و درخواست شما جهت بررسی نهایی به تیم پشتیبانی woYab ارسال گردید.<br/><br/>اطلاعات ارسالی شما توسط کارشناسان بررسی خواهد شد و نتیجه آن به زودی از طریق همین ایمیل اطلاع‌رسانی می‌گردد.`;
  let details = [
    { label: "نام کسب‌وکار", value: input.businessName },
    { label: "نام متقاضی", value: input.claimantName },
    { label: "ایمیل رسمی ثبت‌شده", value: input.officialBusinessEmail },
    { label: "وضعیت درخواست", value: "در انتظار بررسی توسط مدیران (Under Review)" },
  ];
  let footerNote = "با تشکر از صبر و همکاری شما،<br/><strong>تیم پشتیبانی woYab (woYab Team)</strong><br/><br/><small style='color:#64748b;font-size:11px;display:block;margin-top:10px;'>این پیام به منظور انجام اقدامات پیش‌قراردادی و بررسی درخواست شما ارسال شده است (مطابق ماده 6(1)(b) قانون GDPR). شما می‌توانید در هر زمان از طریق داشبورد خود از این درخواست انصراف دهید.</small>";
  let actionBtn = { label: "مشاهده وضعیت در داشبورد", url: dashboardUrl };
  let subject = `درخواست مالکیت کسب‌وکار ${input.businessName} ثبت شد | woYab`;

  if (isDe) {
    badgeText = "In Prüfung";
    title = "Ihr Inhaberantrag wurde empfangen";
    subtitle = `Hallo ${input.claimantName},<br/>vielen Dank für Ihren Antrag auf Verwaltung des Unternehmens <strong>${input.businessName}</strong>. Ihre E-Mail wurde erfolgreich verifiziert und Ihr Antrag wurde zur abschließenden Prüfung an das woYab-Support-Team weitergeleitet.<br/><br/>Ihre Angaben werden von unseren Experten geprüft und das Ergebnis wird Ihnen in Kürze per E-Mail mitgeteilt.`;
    details = [
      { label: "Unternehmensname", value: input.businessName },
      { label: "Antragsteller", value: input.claimantName },
      { label: "Offizielle E-Mail", value: input.officialBusinessEmail },
      { label: "Status", value: "In Prüfung durch Moderatoren (Under Review)" },
    ];
    footerNote = "Vielen Dank für Ihre Geduld und Zusammenarbeit,<br/><strong>Ihr woYab Support Team</strong><br/><br/><small style='color:#64748b;font-size:11px;display:block;margin-top:10px;'>Diese Nachricht wurde zur Durchführung vorvertraglicher Maßnahmen und zur Prüfung Ihres Antrags gesendet (gemäß Art. 6 Abs. 1 lit. b DSGVO). Sie können Ihren Antrag jederzeit über Ihr Dashboard zurückziehen.</small>";
    actionBtn = { label: "Status im Dashboard ansehen", url: dashboardUrl };
    subject = `Inhaberantrag für ${input.businessName} eingereicht | woYab`;
  } else if (isEn) {
    badgeText = "Under Review";
    title = "Your ownership claim was received";
    subtitle = `Hello ${input.claimantName},<br/>Thank you for submitting a claim to manage <strong>${input.businessName}</strong>. Your email was successfully verified and your request has been forwarded to the woYab support team for final review.<br/><br/>Your submitted information will be reviewed by our specialists and you will be notified of the result shortly.`;
    details = [
      { label: "Business name", value: input.businessName },
      { label: "Applicant", value: input.claimantName },
      { label: "Official email", value: input.officialBusinessEmail },
      { label: "Status", value: "Awaiting admin review" },
    ];
    footerNote = "Thank you for your patience and cooperation,<br/><strong>woYab Support Team</strong><br/><br/><small style='color:#64748b;font-size:11px;display:block;margin-top:10px;'>This message is sent for the performance of pre-contractual measures and to process your request (according to Art. 6(1)(b) GDPR). You can withdraw this request at any time via your dashboard.</small>";
    actionBtn = { label: "View status in dashboard", url: dashboardUrl };
    subject = `Ownership claim for ${input.businessName} submitted | woYab`;
  }

  const html = renderEmailCard({
    badgeText,
    badgeBg: "#f59e0b",
    title,
    subtitle,
    details,
    actionButton: actionBtn,
    footerNote,
    locale: input.locale || "fa",
  });

  await sendMail({
    to: input.to,
    subject,
    text: title,
    html,
  });
}

export async function sendBusinessClaimApprovedEmail(input: {
  to: string;
  businessName: string;
  claimantName: string;
  locale?: string;
}) {
  const isDe = input.locale?.toLowerCase().startsWith("de");
  const isEn = input.locale?.toLowerCase().startsWith("en");
  const isFa = !isDe && !isEn;

  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://woyab.ir"}/${input.locale || "fa"}/business-portal`;

  let badgeText = "تایید شد";
  let title = "تایید درخواست مالکیت کسب‌وکار";
  let subtitle = `سلام ${input.claimantName} عزیز،<br/>با خوشحالی به اطلاع می‌رسانیم که درخواست مالکیت شما برای کسب‌وکار <strong>${input.businessName}</strong> با موفقیت تایید شد.<br/><br/>اکنون دسترسی کامل پنل مدیریت این کسب‌وکار برای حساب شما فعال شده است.`;
  let details = [
    { label: "نام کسب‌وکار", value: input.businessName },
    { label: "نام متقاضی", value: input.claimantName },
    { label: "وضعیت دسترسی", value: "فعال (Owner Access)" },
  ];
  let footerNote = "با تشکر از همراهی شما،<br/><strong>تیم woYab (woYab Team)</strong>";
  let actionBtn = { label: "ورود به داشبورد صاحب کسب‌وکار", url: dashboardUrl };
  let subject = `مالکیت کسب‌وکار ${input.businessName} تایید شد | woYab`;

  if (isDe) {
    badgeText = "Genehmigt";
    title = "Inhaberantrag genehmigt";
    subtitle = `Hallo ${input.claimantName},<br/>wir freuen uns Ihnen mitteilen zu können, dass Ihr Inhaberantrag für das Unternehmen <strong>${input.businessName}</strong> erfolgreich genehmigt wurde.<br/><br/>Der volle Zugriff auf das Verwaltungs-Dashboard dieses Unternehmens ist nun für Ihr Konto freigeschaltet.`;
    details = [
      { label: "Unternehmensname", value: input.businessName },
      { label: "Antragsteller", value: input.claimantName },
      { label: "Zugriffsstatus", value: "Aktiv (Owner Access)" },
    ];
    footerNote = "Vielen Dank für Ihre Unterstützung,<br/><strong>Ihr woYab Team</strong>";
    actionBtn = { label: "Zum Inhaber-Dashboard", url: dashboardUrl };
    subject = `Inhaberschaft für ${input.businessName} genehmigt | woYab`;
  } else if (isEn) {
    badgeText = "Approved";
    title = "Ownership claim approved";
    subtitle = `Hello ${input.claimantName},<br/>We are happy to inform you that your ownership claim for <strong>${input.businessName}</strong> has been successfully approved.<br/><br/>Full management access to this business is now activated for your account.`;
    details = [
      { label: "Business name", value: input.businessName },
      { label: "Applicant", value: input.claimantName },
      { label: "Access status", value: "Active (Owner Access)" },
    ];
    footerNote = "Thank you for being with us,<br/><strong>woYab Team</strong>";
    actionBtn = { label: "Go to owner dashboard", url: dashboardUrl };
    subject = `Ownership for ${input.businessName} approved | woYab`;
  }

  const html = renderEmailCard({
    badgeText,
    badgeBg: "#10b981",
    title,
    subtitle,
    details,
    actionButton: actionBtn,
    footerNote,
    locale: input.locale || "fa",
  });

  await sendMail({
    to: input.to,
    subject,
    text: title,
    html,
  });
}

export async function sendBusinessClaimWarningEmailToCurrentOwner(input: {
  to: string;
  businessName: string;
  claimantName: string;
  locale?: string;
}) {
  const isDe = input.locale?.toLowerCase().startsWith("de");
  const isEn = input.locale?.toLowerCase().startsWith("en");

  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://woyab.ir"}/${input.locale || "fa"}/business-portal`;

  let badgeText = "هشدار امنیتی";
  let title = "تلاش برای انتقال مالکیت کسب‌وکار شما";
  let subtitle = `مالک محترم کسب‌وکار <strong>${input.businessName}</strong>،<br/>به اطلاع می‌رسانیم که شخصی به نام <strong>${input.claimantName}</strong> به آدرس ایمیل رسمی کسب‌وکار شما دسترسی پیدا کرده و درخواست انتقال مالکیت در سیستم woYab ثبت کرده است.<br/><br/>اگر شما این شخص را می‌شناسید (مثلاً مالک جدید یا کارمند شماست)، نیازی به انجام کاری نیست. اما اگر این درخواست بدون هماهنگی شما ثبت شده، لطفاً در اسرع وقت از طریق داشبورد به ما اطلاع دهید.`;
  let details = [
    { label: "نام کسب‌وکار", value: input.businessName },
    { label: "متقاضی جدید", value: input.claimantName },
    { label: "مهلت پاسخ‌گویی", value: "۱۴ روز" },
  ];
  let footerNote = "با تشکر،<br/><strong>تیم woYab (woYab Team)</strong><br/><br/><small style='color:#64748b;font-size:11px;display:block;margin-top:10px;'>این پیام مطابق با قوانین حفاظت از داده‌ها (GDPR Art. 6(1)(f)) و برای حفظ امنیت اطلاعات کسب‌وکار شما ارسال شده است.</small>";
  let actionBtn = { label: "ورود به داشبورد", url: dashboardUrl };
  let subject = `هشدار: درخواست مالکیت جدید برای ${input.businessName} | woYab`;

  if (isDe) {
    badgeText = "Sicherheitswarnung";
    title = "Versuch der Eigentumsübertragung";
    subtitle = `Sehr geehrte(r) Inhaber(in) von <strong>${input.businessName}</strong>,<br/>wir möchten Sie darüber informieren, dass eine Person namens <strong>${input.claimantName}</strong> Zugriff auf die offizielle E-Mail-Adresse Ihres Unternehmens erhalten und einen Inhaberantrag bei woYab gestellt hat.<br/><br/>Wenn Sie diese Person kennen, müssen Sie nichts weiter tun. Sollte dieser Antrag jedoch ohne Ihr Einverständnis gestellt worden sein, melden Sie sich bitte umgehend über Ihr Dashboard.`;
    details = [
      { label: "Unternehmen", value: input.businessName },
      { label: "Neuer Antragsteller", value: input.claimantName },
      { label: "Frist", value: "14 Tage" },
    ];
    footerNote = "Mit freundlichen Grüßen,<br/><strong>Ihr woYab Team</strong><br/><br/><small style='color:#64748b;font-size:11px;display:block;margin-top:10px;'>Diese Nachricht wird in Übereinstimmung mit Art. 6 Abs. 1 lit. f DSGVO gesendet, um die Sicherheit Ihres Unternehmenskontos zu gewährleisten.</small>";
    actionBtn = { label: "Zum Dashboard", url: dashboardUrl };
    subject = `Warnung: Neuer Inhaberantrag für ${input.businessName} | woYab`;
  } else if (isEn) {
    badgeText = "Security Warning";
    title = "Attempted Ownership Transfer";
    subtitle = `Dear Owner of <strong>${input.businessName}</strong>,<br/>We would like to inform you that a person named <strong>${input.claimantName}</strong> has accessed your official business email address and submitted an ownership claim on woYab.<br/><br/>If you know this person (e.g., a new owner or employee), no action is required. However, if this request was submitted without your consent, please inform us immediately via your dashboard.`;
    details = [
      { label: "Business name", value: input.businessName },
      { label: "New claimant", value: input.claimantName },
      { label: "Deadline", value: "14 Days" },
    ];
    footerNote = "Thank you,<br/><strong>woYab Team</strong><br/><br/><small style='color:#64748b;font-size:11px;display:block;margin-top:10px;'>This message is sent in accordance with GDPR Art. 6(1)(f) to protect the security of your business account.</small>";
    actionBtn = { label: "Go to Dashboard", url: dashboardUrl };
    subject = `Warning: New ownership claim for ${input.businessName} | woYab`;
  }

  const html = renderEmailCard({
    badgeText,
    badgeBg: "#ef4444",
    title,
    subtitle,
    details,
    actionButton: actionBtn,
    footerNote,
    locale: input.locale || "fa",
  });

  await sendMail({
    to: input.to,
    subject,
    text: title,
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
