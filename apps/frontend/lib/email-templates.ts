import "server-only";

export type EmailCardOptions = {
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeBg?: string;
  details?: { label: string; value: string }[];
  actionButton?: { label: string; url: string };
  footerNote?: string;
};

export function renderEmailCard(options: EmailCardOptions): string {
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

  const footerHtml = options.footerNote
    ? `
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">${options.footerNote}</p>
    `
    : `
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">با تشکر از همراهی شما،<br/><strong>تیم پشتیبانی فارگو (Fargo Team)</strong></p>
    `;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9f9f9; padding: 40px 20px; direction: rtl; text-align: right;">
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

export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}
