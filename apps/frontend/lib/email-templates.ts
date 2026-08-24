import "server-only";

export type EmailCardOptions = {
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeBg?: string;
  details?: { label: string; value: string }[];
  actionButton?: { label: string; url: string };
  footerNote?: string;
  locale?: string;
};

export function renderEmailCard(options: EmailCardOptions): string {
  const isRtl = options.locale?.toLowerCase().startsWith("fa") ?? true;
  const dir = isRtl ? "rtl" : "ltr";
  const textAlign = isRtl ? "right" : "left";

  const detailsHtml = options.details && options.details.length > 0
    ? `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 22px; margin-bottom: 24px;">
        ${options.details.map(d => `
          <div style="margin-bottom: 8px; font-size: 14px; color: #475569; line-height: 1.5;">
            <strong style="color: #0f172a;">${escapeHtml(d.label)}:</strong> ${escapeHtml(d.value)}
          </div>
        `).join("")}
      </div>
    `
    : "";

  const actionBtnHtml = options.actionButton
    ? `
      <div style="margin-bottom: 28px;">
        <a href="${options.actionButton.url}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 12px 24px; border-radius: 8px;">${escapeHtml(options.actionButton.label)}</a>
      </div>
    `
    : "";

  const badgeHtml = options.badgeText
    ? `<div style="margin-bottom: 16px;"><span style="display: inline-block; background-color: ${options.badgeBg || "#0f172a"}; color: #ffffff; font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 20px; letter-spacing: 0.5px;">${escapeHtml(options.badgeText)}</span></div>`
    : "";

  const defaultFooter = isRtl
    ? "با تشکر از همراهی شما،<br/><strong>تیم پشتیبانی woYab (woYab Team)</strong>"
    : options.locale?.toLowerCase().startsWith("de")
    ? "Vielen Dank für Ihre Unterstützung,<br/><strong>Ihr woYab Team</strong>"
    : "Thank you for choosing woYab,<br/><strong>woYab Support Team</strong>";

  const footerHtml = `
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">${options.footerNote || defaultFooter}</p>
  `;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9f9f9; padding: 40px 20px; direction: ${dir}; text-align: ${textAlign};">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="width: 48px; height: 48px; border-radius: 12px; background-color: #0f172a; color: #ffffff; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; font-weight: 900; font-size: 18px; font-family: sans-serif;" dir="ltr">
          FA
        </div>
        ${badgeHtml}
        <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.4;">${options.title}</h1>
        ${options.subtitle ? `<p style="margin: 0 0 24px; font-size: 15px; color: #334155; line-height: 1.7;">${options.subtitle}</p>` : ""}
        ${detailsHtml}
        ${actionBtnHtml}
        ${footerHtml}
      </div>
    </div>
  `;
}

export function buildReviewModerationEmail(input: {
  userName?: string | null;
  businessName: string;
  rating?: number | null;
  reviewTitle?: string | null;
  status: "APPROVED" | "REJECTED";
  locale?: string;
}) {
  const isApproved = input.status === "APPROVED";
  const loc = (input.locale || "fa").toLowerCase();
  const stars = input.rating ? "★".repeat(input.rating) + "☆".repeat(5 - input.rating) : null;

  if (loc.startsWith("de")) {
    const title = isApproved ? "Ihre Bewertung wurde veröffentlicht" : "Ergebnis der Bewertungsprüfung";
    const subtitle = isApproved
      ? `Hallo ${input.userName || ""},<br/>vielen Dank für Ihre Bewertung! Ihre Bewertung für <strong>${escapeHtml(input.businessName)}</strong> wurde erfolgreich geprüft und auf woYab veröffentlicht.`
      : `Hallo ${input.userName || ""},<br/>vielen Dank für Ihren Beitrag. Ihre Bewertung für <strong>${escapeHtml(input.businessName)}</strong> konnte nach der Prüfung leider nicht veröffentlicht werden, da sie nicht unseren Richtlinien entspricht.`;

    const details = [
      { label: "Unternehmen", value: input.businessName },
      ...(stars ? [{ label: "Bewertung", value: `${input.rating} von 5 (${stars})` }] : []),
      ...(input.reviewTitle ? [{ label: "Titel der Bewertung", value: input.reviewTitle }] : []),
      { label: "Status", value: isApproved ? "Veröffentlicht (Genehmigt)" : "Nicht genehmigt" },
    ];

    const html = renderEmailCard({
      title,
      subtitle,
      badgeText: isApproved ? "Veröffentlicht" : "Nicht genehmigt",
      badgeBg: isApproved ? "#10b981" : "#ef4444",
      details,
      locale: "de",
    });

    return {
      subject: `Ergebnis Ihrer Bewertung für ${input.businessName} | woYab`,
      text: `Ihre Bewertung für ${input.businessName} wurde ${isApproved ? "genehmigt und veröffentlicht" : "abgelehnt"}.`,
      html,
    };
  } else if (loc.startsWith("en")) {
    const title = isApproved ? "Your review has been published" : "Review Moderation Update";
    const subtitle = isApproved
      ? `Hello ${input.userName || ""},<br/>Thank you for your feedback! Your review for <strong>${escapeHtml(input.businessName)}</strong> has been approved and published on woYab.`
      : `Hello ${input.userName || ""},<br/>Thank you for your submission. Your review for <strong>${escapeHtml(input.businessName)}</strong> was reviewed but could not be published as it does not meet our content guidelines.`;

    const details = [
      { label: "Business", value: input.businessName },
      ...(stars ? [{ label: "Rating", value: `${input.rating} of 5 (${stars})` }] : []),
      ...(input.reviewTitle ? [{ label: "Review Title", value: input.reviewTitle }] : []),
      { label: "Status", value: isApproved ? "Approved & Published" : "Not Approved" },
    ];

    const html = renderEmailCard({
      title,
      subtitle,
      badgeText: isApproved ? "Published" : "Not Approved",
      badgeBg: isApproved ? "#10b981" : "#ef4444",
      details,
      locale: "en",
    });

    return {
      subject: `Update on your review for ${input.businessName} | woYab`,
      text: `Your review for ${input.businessName} was ${isApproved ? "approved and published" : "rejected"}.`,
      html,
    };
  } else {
    // Default Persian (fa)
    const title = isApproved ? "نظر شما تایید و منتشر گردید" : "نتیجه بررسی نظر شما";
    const subtitle = isApproved
      ? `سلام ${input.userName ? `${escapeHtml(input.userName)} عزیز` : "گرامی"}،<br/>با تشکر از دیدگاه ارزشمند شما، نظر ارسالی شما برای کسب‌وکار <strong>${escapeHtml(input.businessName)}</strong> پس از بررسی و پایش محتوا تایید و روی سایت منتشر گردید.`
      : `سلام ${input.userName ? `${escapeHtml(input.userName)} عزیز` : "گرامی"}،<br/>به اطلاع می‌رسانیم نظر ارسالی شما برای کسب‌وکار <strong>${escapeHtml(input.businessName)}</strong> پس از بررسی، به دلیل عدم مطابقت کامل با ضوابط انتشار نظرات در woYab تایید نگردید.`;

    const details = [
      { label: "نام کسب‌وکار", value: input.businessName },
      ...(stars ? [{ label: "امتیاز ثبت‌شده", value: `${input.rating} از ۵ (${stars})` }] : []),
      ...(input.reviewTitle ? [{ label: "عنوان نظر", value: input.reviewTitle }] : []),
      { label: "وضعیت انتشار", value: isApproved ? "تایید و منتشر شد" : "تایید نشد" },
    ];

    const html = renderEmailCard({
      title,
      subtitle,
      badgeText: isApproved ? "منتشر شد" : "تایید نشد",
      badgeBg: isApproved ? "#10b981" : "#ef4444",
      details,
      locale: "fa",
    });

    return {
      subject: `نتیجه بررسی نظر شما برای ${input.businessName} | woYab`,
      text: `نظر شما برای ${input.businessName} ${isApproved ? "تایید و منتشر شد" : "تایید نشد"}.`,
      html,
    };
  }
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

export function buildAccountVerificationEmail(input: {
  name?: string | null;
  verifyUrl: string;
  locale?: string;
}) {
  const loc = (input.locale || "fa").toLowerCase();

  if (loc.startsWith("de")) {
    const title = "Bestätigen Sie Ihre E-Mail-Adresse";
    const subtitle = `Hallo ${input.name ? escapeHtml(input.name) : ""},<br/>Bitte bestätigen Sie Ihre woYab E-Mail-Adresse über den untenstehenden Button. Dieser Link ist 24 Stunden gültig.`;
    
    const html = renderEmailCard({
      title,
      subtitle,
      actionButton: { label: "E-Mail-Adresse bestätigen", url: input.verifyUrl },
      locale: "de",
    });

    return {
      subject: "Bestätigen Sie Ihre E-Mail-Adresse | woYab",
      text: `Hallo ${input.name || "dort"},\n\nBestätigen Sie Ihre woYab E-Mail-Adresse über diesen Link. Er ist 24 Stunden gültig:\n\n${input.verifyUrl}`,
      html,
    };
  } else if (loc.startsWith("en")) {
    const title = "Verify your email address";
    const subtitle = `Hello ${input.name ? escapeHtml(input.name) : ""},<br/>Please verify your woYab email address by clicking the button below. This link will expire in 24 hours.`;
    
    const html = renderEmailCard({
      title,
      subtitle,
      actionButton: { label: "Verify email address", url: input.verifyUrl },
      locale: "en",
    });

    return {
      subject: "Verify your email address | woYab",
      text: `Hello ${input.name || "there"},\n\nVerify your woYab email address using this link. It expires in 24 hours:\n\n${input.verifyUrl}`,
      html,
    };
  } else {
    // Default Persian (fa)
    const title = "تایید آدرس ایمیل";
    const subtitle = `سلام ${input.name ? `${escapeHtml(input.name)} عزیز` : "گرامی"}،<br/>لطفا آدرس ایمیل حساب کاربری woYab خود را از طریق دکمه زیر تایید کنید. این لینک تا ۲۴ ساعت آینده معتبر است.`;
    
    const html = renderEmailCard({
      title,
      subtitle,
      actionButton: { label: "تایید ایمیل", url: input.verifyUrl },
      locale: "fa",
    });

    return {
      subject: "تایید آدرس ایمیل | woYab",
      text: `سلام ${input.name || "کاربر گرامی"},\n\nلطفا آدرس ایمیل خود را از طریق لینک زیر تایید کنید. این لینک تا ۲۴ ساعت اعتبار دارد:\n\n${input.verifyUrl}`,
      html,
    };
  }
}
