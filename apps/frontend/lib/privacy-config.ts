import "server-only";

const requiredProductionValues = [
  "LEGAL_CONTROLLER_NAME",
  "LEGAL_CONTROLLER_ADDRESS",
  "PRIVACY_EMAIL",
  "PRIVACY_SUPERVISORY_AUTHORITY",
  "CLAIM_PRIVACY_NOTICE_VERSION",
  "CLAIM_TERMS_VERSION",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_FROM",
  "CRON_SECRET",
  "INTERNAL_API_SECRET",
] as const;

export function assertProductionConfiguration() {
  if (process.env.NODE_ENV !== "production") return;
  const missing = requiredProductionValues.filter((key) => !process.env[key]?.trim());
  if (missing.length) throw new Error(`Missing required production configuration: ${missing.join(", ")}`);
  const smtpPort = Number(process.env.SMTP_PORT);
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65_535) throw new Error("SMTP_PORT must be a valid TCP port.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.PRIVACY_EMAIL!)) throw new Error("PRIVACY_EMAIL must be a valid email address.");
  const smtpFrom = process.env.SMTP_FROM!.match(/<([^>]+)>/)?.[1] ?? process.env.SMTP_FROM!;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtpFrom)) throw new Error("SMTP_FROM must contain a valid email address.");
  if (Boolean(process.env.SMTP_USER) !== Boolean(process.env.SMTP_PASSWORD)) throw new Error("SMTP_USER and SMTP_PASSWORD must either both be set or both be empty.");
  if (process.env.PRIVACY_SUPERVISORY_AUTHORITY_URL && !process.env.PRIVACY_SUPERVISORY_AUTHORITY_URL.startsWith("https://")) throw new Error("PRIVACY_SUPERVISORY_AUTHORITY_URL must use HTTPS.");
  if (process.env.CRON_SECRET!.length < 24) throw new Error("CRON_SECRET must contain at least 24 characters.");
  if (process.env.INTERNAL_API_SECRET!.length < 32) throw new Error("INTERNAL_API_SECRET must contain at least 32 characters.");
}

export function getPublicLegalConfig() {
  assertProductionConfiguration();
  return {
    controllerName: process.env.LEGAL_CONTROLLER_NAME?.trim() || null,
    controllerAddress: process.env.LEGAL_CONTROLLER_ADDRESS?.trim() || null,
    privacyEmail: process.env.PRIVACY_EMAIL?.trim() || null,
    supervisoryAuthority: process.env.PRIVACY_SUPERVISORY_AUTHORITY?.trim() || null,
    supervisoryAuthorityUrl: process.env.PRIVACY_SUPERVISORY_AUTHORITY_URL?.trim() || null,
  };
}
