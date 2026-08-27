import "server-only";

import { Resend } from "resend";

export type MailSender = "transactional" | "support";

export type Mail = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  from?: MailSender;
  replyTo?: string;
  idempotencyKey?: string;
};

function value(name: string, fallback: string) {
  return process.env[name]?.trim() || fallback;
}

export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function mailAddress(kind: MailSender) {
  if (kind === "support") return value("EMAIL_FROM_SUPPORT", "WoYab Support <support@woyab.com>");
  return value("EMAIL_FROM_NO_REPLY", "WoYab <no-reply@woyab.com>");
}

export function supportEmail() {
  return value("SUPPORT_EMAIL", "support@woyab.com");
}

export function privacyEmail() {
  return value("PRIVACY_EMAIL", "privacy@woyab.com");
}

export async function sendMail(mail: Mail) {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is not configured.");
    console.info("Resend is not configured. Email preview:", mail);
    return undefined;
  }

  const resend = new Resend(process.env.RESEND_API_KEY!);
  const { data, error } = await resend.emails.send({
    from: mailAddress(mail.from ?? "transactional"),
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    replyTo: mail.replyTo ?? supportEmail(),
    headers: mail.idempotencyKey ? { "Idempotency-Key": mail.idempotencyKey } : undefined,
  });

  if (error) throw new Error(`Resend email failed: ${error.message}`);
  return data?.id;
}
