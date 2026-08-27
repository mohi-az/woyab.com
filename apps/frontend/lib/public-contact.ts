import "server-only";

import { escapeHtml, renderEmailCard } from "@/lib/email-templates";

export const publicContactSubjects = [
  "GENERAL",
  "ACCOUNT",
  "BUSINESS_OWNERSHIP",
  "PARTNERSHIP",
  "PRIVACY",
  "OTHER",
] as const;

export type PublicContactSubject = (typeof publicContactSubjects)[number];

const labels: Record<string, Record<PublicContactSubject, string>> = {
  de: {
    GENERAL: "Allgemeine Anfrage",
    ACCOUNT: "Konto und Anmeldung",
    BUSINESS_OWNERSHIP: "Unternehmen und Inhaberschaft",
    PARTNERSHIP: "Partnerschaft",
    PRIVACY: "Datenschutz",
    OTHER: "Sonstiges",
  },
  en: {
    GENERAL: "General inquiry",
    ACCOUNT: "Account and sign-in",
    BUSINESS_OWNERSHIP: "Business and ownership",
    PARTNERSHIP: "Partnership",
    PRIVACY: "Privacy",
    OTHER: "Other",
  },
  fa: {
    GENERAL: "پرسش عمومی",
    ACCOUNT: "حساب کاربری و ورود",
    BUSINESS_OWNERSHIP: "کسب‌وکار و مالکیت",
    PARTNERSHIP: "همکاری",
    PRIVACY: "حریم خصوصی",
    OTHER: "سایر",
  },
};

function normalizedLocale(locale?: string) {
  return locale?.startsWith("fa") ? "fa" : locale?.startsWith("de") ? "de" : "en";
}

export function publicContactSubjectLabel(subject: PublicContactSubject, locale?: string) {
  return labels[normalizedLocale(locale)][subject];
}

export function buildPublicContactNotification(input: {
  name: string;
  email: string;
  phone?: string | null;
  subject: PublicContactSubject;
  message: string;
  locale?: string;
}) {
  const subjectLabel = publicContactSubjectLabel(input.subject, input.locale);
  const details = [
    { label: "Name", value: input.name },
    { label: "Email", value: input.email },
    ...(input.phone ? [{ label: "Phone", value: input.phone }] : []),
    { label: "Subject", value: subjectLabel },
  ];
  const safeMessage = escapeHtml(input.message).replace(/\n/g, "<br />");
  const html = renderEmailCard({
    title: "New website contact request",
    subtitle: `<strong>Message:</strong><br/>${safeMessage}`,
    details,
    locale: "en",
  });

  return {
    subject: `[WoYab] ${subjectLabel}`,
    text: `Name: ${input.name}\nEmail: ${input.email}\nPhone: ${input.phone || "-"}\nSubject: ${subjectLabel}\n\n${input.message}`,
    html,
  };
}

export function buildPublicContactReceipt(input: {
  name: string;
  subject: PublicContactSubject;
  locale?: string;
}) {
  const locale = normalizedLocale(input.locale);
  const subjectLabel = publicContactSubjectLabel(input.subject, locale);
  const copy = locale === "de"
    ? {
      title: "Wir haben Ihre Nachricht erhalten",
      subtitle: `Hallo ${escapeHtml(input.name)},<br/>vielen Dank für Ihre Nachricht zum Thema <strong>${escapeHtml(subjectLabel)}</strong>. Unser Team meldet sich so bald wie möglich bei Ihnen.`,
      subject: "Wir haben Ihre Nachricht erhalten | WoYab",
      text: `Hallo ${input.name},\n\nvielen Dank für Ihre Nachricht zum Thema ${subjectLabel}. Unser Team meldet sich so bald wie möglich bei Ihnen.`,
    }
    : locale === "fa"
      ? {
        title: "پیام شما دریافت شد",
        subtitle: `سلام ${escapeHtml(input.name)}،<br/>پیام شما با موضوع <strong>${escapeHtml(subjectLabel)}</strong> دریافت شد. تیم ما در اولین فرصت با شما تماس می‌گیرد.`,
        subject: "پیام شما دریافت شد | WoYab",
        text: `سلام ${input.name}،\n\nپیام شما با موضوع ${subjectLabel} دریافت شد. تیم ما در اولین فرصت با شما تماس می‌گیرد.`,
      }
      : {
        title: "We received your message",
        subtitle: `Hello ${escapeHtml(input.name)},<br/>Thank you for contacting us about <strong>${escapeHtml(subjectLabel)}</strong>. Our team will get back to you as soon as possible.`,
        subject: "We received your message | WoYab",
        text: `Hello ${input.name},\n\nThank you for contacting us about ${subjectLabel}. Our team will get back to you as soon as possible.`,
      };

  return {
    ...copy,
    html: renderEmailCard({ title: copy.title, subtitle: copy.subtitle, locale }),
  };
}
