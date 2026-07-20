import { getLocale } from "next-intl/server";
import { getPublicLegalConfig } from "@/lib/privacy-config";

const policy = {
  en: {
    title: "Fargo Privacy Policy",
    intro: "This policy explains how Fargo processes personal data across the public directory, user accounts, reviews, reports, business tools and support services.",
    updated: "Effective date: 20 July 2026",
    sections: [
      ["1. Controller and contact", "The controller is the Fargo operator identified below. Privacy and data-subject requests may be sent to the published privacy email address."],
      ["2. Data we process", "Depending on your use, we process account details, verified email status, password hashes, optional profile and saved-location data, reviews, favorites, reports, support requests, business claims, owner submissions, contact messages, authentication and security records, IP-derived anti-abuse identifiers, device and diagnostic information, and timestamps. Raw passwords, raw email-verification tokens and raw authenticator secrets are not stored."],
      ["3. Purposes and legal bases", "We process data to create and secure accounts, provide requested directory and owner functions, publish approved contributions, respond to support and reports, prevent fraud and abuse, maintain evidence of moderation, comply with legal duties, and defend legal claims. The legal bases are Article 6(1)(b), 6(1)(c) and 6(1)(f) GDPR as applicable. Optional technologies are used only under Article 6(1)(a) where consent is required."],
      ["4. Email verification and account security", "Password registrations require email verification before login. Administrator access additionally requires a TOTP authenticator code. Verification tokens are single-use, expire automatically and are stored only as hashes. Privileged authenticator secrets are encrypted at rest."],
      ["5. Public content", "Approved business information and reviews may be visible publicly. Public responses do not expose a business owner's private account email or internal user identifier. If an account is anonymized, retained reviews no longer identify the account."],
      ["6. Reports and moderation", "Reports may contain contact details, the reported target, reasons, evidence and technical anti-abuse information. Signed-in reporters can view status in their dashboard. Final report and moderation decisions may be sent by email. Internal moderator notes are not included in public notifications."],
      ["7. Recipients and service providers", "Access is limited to authorized Fargo personnel and providers needed for hosting, database operation, authentication, email delivery, error monitoring, maps and location services. Data is disclosed to public authorities only when legally required or necessary for legal claims."],
      ["8. International transfers", "Where a provider processes data outside the EEA, Fargo relies on an adequacy decision or appropriate safeguards such as Standard Contractual Clauses, together with supplementary measures where required."],
      ["9. Retention", "Account data is kept while the account is active. Expired verification and anti-abuse records are deleted after their operational period. Closed reports and moderation records are retained only as long as needed for safety, disputes and legal obligations. Business-claim retention periods are described in the supplemental claim notice. Backups expire under the infrastructure backup cycle."],
      ["10. Account deletion and anonymization", "Users may permanently erase their account and contributed reviews, or delete the account while retaining reviews without an author identity. Private profile data, credentials, saved locations, favorites, support tickets and local avatar files are removed. Claims, reports and audit evidence that must remain are detached and personal fields are redacted. Administrator accounts require a controlled removal process."],
      ["11. Cookies and local storage", "Strictly necessary cookies and storage support sessions, security, language and privacy choices. Optional analytics or similar technologies are activated only according to the cookie choices available on the platform."],
      ["12. Your rights", "Subject to the GDPR conditions, you may request access, rectification, erasure, restriction, portability or object to processing based on legitimate interests. You may withdraw consent for the future and lodge a complaint with the competent supervisory authority."],
      ["13. Automated safeguards and abuse prevention", "Fargo uses rate limits, verification status and security signals to block automated or excessive requests. These controls protect users and infrastructure; significant moderation decisions remain reviewable by authorized staff."],
      ["14. Changes", "Material changes will be published here and, where required, communicated through the account or email before they take effect."],
    ],
  },
  de: {
    title: "Datenschutzerklärung von Fargo",
    intro: "Diese Erklärung beschreibt die Verarbeitung personenbezogener Daten im öffentlichen Verzeichnis, in Nutzerkonten, Bewertungen, Meldungen, Unternehmenswerkzeugen und Supportdiensten.",
    updated: "Gültig ab: 20. Juli 2026",
    sections: [
      ["1. Verantwortlicher und Kontakt", "Verantwortlicher ist der unten bezeichnete Fargo-Betreiber. Datenschutzanfragen und Betroffenenrechte können an die veröffentlichte Datenschutzadresse gerichtet werden."],
      ["2. Verarbeitete Daten", "Je nach Nutzung verarbeiten wir Kontodaten, E-Mail-Bestätigungsstatus, Passwort-Hashes, freiwillige Profil- und Standortdaten, Bewertungen, Favoriten, Meldungen, Supportanfragen, Unternehmens-Claims, Inhabereingaben, Kontaktnachrichten, Authentifizierungs- und Sicherheitsprotokolle, pseudonymisierte Missbrauchsschutzmerkmale sowie Zeit- und Diagnosedaten. Unverschlüsselte Passwörter, Verifizierungslinks und Authenticator-Geheimnisse werden nicht gespeichert."],
      ["3. Zwecke und Rechtsgrundlagen", "Die Verarbeitung erfolgt zur Kontoerstellung und -sicherung, Erbringung der angeforderten Verzeichnis- und Inhaberfunktionen, Veröffentlichung freigegebener Beiträge, Bearbeitung von Support und Meldungen, Betrugs- und Missbrauchsprävention, Moderationsnachweis, Erfüllung rechtlicher Pflichten und Rechtsverteidigung. Rechtsgrundlagen sind je nach Fall Art. 6 Abs. 1 lit. b, c und f DSGVO; optionale Technologien beruhen erforderlichenfalls auf Einwilligung nach lit. a."],
      ["4. E-Mail-Bestätigung und Kontosicherheit", "Passwortkonten können erst nach E-Mail-Bestätigung genutzt werden. Administratoren müssen zusätzlich einen TOTP-Code eingeben. Einmaltoken laufen ab und werden nur gehasht gespeichert; Authenticator-Geheimnisse werden verschlüsselt gespeichert."],
      ["5. Öffentliche Inhalte", "Freigegebene Unternehmensangaben und Bewertungen können öffentlich sichtbar sein. Private Konto-E-Mails und interne Nutzerkennungen von Inhabern werden nicht veröffentlicht. Bei Anonymisierung bleibt eine Bewertung ohne Zuordnung zum Konto bestehen."],
      ["6. Meldungen und Moderation", "Meldungen können Kontaktdaten, Ziel, Begründung, Belege und technische Schutzdaten enthalten. Angemeldete Melder sehen den Status im Dashboard. Abschließende Entscheidungen können per E-Mail mitgeteilt werden; interne Moderatornotizen werden nicht versandt."],
      ["7. Empfänger und Dienstleister", "Zugriff erhalten nur berechtigte Fargo-Mitarbeiter und erforderliche Anbieter für Hosting, Datenbank, Authentifizierung, E-Mail, Fehleranalyse, Karten und Standortdienste. Behörden erhalten Daten nur bei gesetzlicher Pflicht oder zur Rechtsverteidigung."],
      ["8. Drittlandübermittlungen", "Bei Verarbeitung außerhalb des EWR stützen wir uns auf einen Angemessenheitsbeschluss oder geeignete Garantien wie EU-Standardvertragsklauseln und erforderliche Zusatzmaßnahmen."],
      ["9. Speicherdauer", "Kontodaten bleiben während der aktiven Nutzung gespeichert. Abgelaufene Verifizierungs- und Schutzdaten werden nach ihrem Betriebszweck gelöscht. Abgeschlossene Moderationsunterlagen bleiben nur für Sicherheit, Streitfälle und gesetzliche Pflichten erhalten. Für Claims gilt der ergänzende Claim-Hinweis."],
      ["10. Löschung und Anonymisierung", "Nutzer können Konto und Bewertungen vollständig löschen oder das Konto löschen und Bewertungen ohne Autorenzuordnung erhalten. Profildaten, Zugangsdaten, gespeicherte Orte, Favoriten, Supporttickets und lokale Profilbilder werden entfernt. Erforderliche Claim-, Melde- und Nachweisdaten werden entkoppelt und personenbezogene Felder geschwärzt. Administratorkonten werden kontrolliert entfernt."],
      ["11. Cookies und lokale Speicherung", "Notwendige Cookies und Speicherfunktionen dienen Sitzung, Sicherheit, Sprache und Datenschutzauswahl. Optionale Analysefunktionen richten sich nach der Einwilligungsauswahl."],
      ["12. Ihre Rechte", "Unter den Voraussetzungen der DSGVO bestehen Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch. Einwilligungen können für die Zukunft widerrufen werden; außerdem besteht ein Beschwerderecht bei der Aufsichtsbehörde."],
      ["13. Missbrauchsschutz", "Fargo verwendet Limits, Verifizierungsstatus und Sicherheitssignale gegen automatisierte oder massenhafte Anfragen. Wesentliche Moderationsentscheidungen bleiben durch berechtigte Mitarbeiter überprüfbar."],
      ["14. Änderungen", "Wesentliche Änderungen werden hier veröffentlicht und, soweit erforderlich, vor Wirksamwerden über Konto oder E-Mail mitgeteilt."],
    ],
  },
  fa: {
    title: "سیاست حریم خصوصی فارگو",
    intro: "این سند توضیح می‌دهد فارگو در دایرکتوری عمومی، حساب کاربران، نظرات، گزارش‌ها، ابزارهای صاحبان کسب‌وکار و پشتیبانی چگونه اطلاعات شخصی را پردازش می‌کند.",
    updated: "تاریخ اجرا: ۲۰ ژوئیهٔ ۲۰۲۶",
    sections: [
      ["۱. مسئول پردازش و راه ارتباطی", "مسئول پردازش، گردانندهٔ فارگو است که اطلاعات او در پایین صفحه آمده است. درخواست‌های مرتبط با حریم خصوصی و حقوق کاربر را می‌توان به ایمیل رسمی حریم خصوصی ارسال کرد."],
      ["۲. اطلاعاتی که پردازش می‌کنیم", "بسته به نوع استفاده، اطلاعات حساب، وضعیت تأیید ایمیل، هش رمز عبور، اطلاعات اختیاری پروفایل و آدرس، نظرات، علاقه‌مندی‌ها، گزارش‌ها، تیکت‌های پشتیبانی، درخواست مالکیت، تغییرات ارسالی مالک، پیام‌های تماس، سوابق ورود و امنیت، شناسه‌های غیرمستقیم مقابله با سوءاستفاده و زمان رخدادها پردازش می‌شوند. رمز عبور، توکن خام تأیید ایمیل و رمز خام برنامهٔ Authenticator ذخیره نمی‌شود."],
      ["۳. هدف و مبنای قانونی", "پردازش برای ساخت و حفاظت حساب، ارائهٔ امکانات درخواستی، انتشار محتوای تأییدشده، رسیدگی به گزارش و پشتیبانی، جلوگیری از تقلب و حملات انبوه، ثبت تصمیم‌های مدیریتی، انجام تکالیف قانونی و دفاع از ادعاهای حقوقی انجام می‌شود. حسب مورد مواد 6(1)(b)، 6(1)(c) و 6(1)(f) GDPR مبنا هستند و فناوری‌های اختیاری در صورت لزوم بر رضایت مادهٔ 6(1)(a) متکی‌اند."],
      ["۴. تأیید ایمیل و امنیت حساب", "ورود حساب‌های ساخته‌شده با رمز عبور فقط پس از تأیید ایمیل ممکن است. مدیران علاوه بر رمز عبور باید کد شش‌رقمی TOTP وارد کنند. توکن‌ها یک‌بارمصرف و زمان‌دار هستند و فقط هش آن‌ها ذخیره می‌شود؛ رمز Authenticator مدیران نیز به‌شکل رمزنگاری‌شده نگهداری می‌شود."],
      ["۵. محتوای عمومی", "اطلاعات تأییدشدهٔ کسب‌وکار و نظرات پذیرفته‌شده ممکن است عمومی باشند. ایمیل خصوصی حساب مالک و شناسهٔ داخلی او منتشر نمی‌شود. در حالت ناشناس‌سازی، نظر باقی می‌ماند اما دیگر به حساب حذف‌شده متصل نیست."],
      ["۶. گزارش‌ها و تصمیم‌های مدیریتی", "گزارش می‌تواند شامل اطلاعات تماس، موضوع گزارش، دلیل، مدرک و داده‌های فنی مقابله با سوءاستفاده باشد. کاربر واردشده وضعیت را در داشبورد می‌بیند و نتیجهٔ نهایی می‌تواند ایمیل شود. یادداشت داخلی مدیر برای گزارش‌دهنده ارسال نمی‌شود."],
      ["۷. دریافت‌کنندگان و ارائه‌دهندگان خدمات", "دسترسی به کارکنان مجاز فارگو و ارائه‌دهندگان ضروری میزبانی، دیتابیس، احراز هویت، ایمیل، پایش خطا، نقشه و موقعیت محدود است. افشا برای مراجع عمومی فقط در صورت الزام قانونی یا ضرورت دفاع حقوقی انجام می‌شود."],
      ["۸. انتقال خارج از منطقهٔ اقتصادی اروپا", "اگر ارائه‌دهنده‌ای خارج از EEA داده را پردازش کند، فارگو از تصمیم کفایت یا تضمین‌هایی مانند بندهای قراردادی استاندارد اتحادیهٔ اروپا و اقدامات تکمیلی لازم استفاده می‌کند."],
      ["۹. مدت نگهداری", "اطلاعات حساب تا زمان فعالیت حساب نگهداری می‌شود. توکن‌های منقضی و داده‌های ضدسوءاستفاده پس از پایان نیاز عملیاتی حذف می‌شوند. گزارش‌ها و تصمیم‌های بسته‌شده فقط تا زمان لازم برای امنیت، اختلافات و تعهدات قانونی باقی می‌مانند. نگهداری Claim در اطلاعیهٔ تکمیلی آن توضیح داده شده است."],
      ["۱۰. حذف و ناشناس‌سازی حساب", "کاربر می‌تواند حساب و نظراتش را کاملاً حذف کند یا حساب را حذف و نظرات را بدون نام نویسنده نگه دارد. پروفایل، اعتبارنامه، آدرس‌ها، علاقه‌مندی‌ها، تیکت‌ها و فایل محلی تصویر حذف می‌شوند. سوابق ضروری Claim، گزارش و ممیزی از حساب جدا و فیلدهای شخصی آن‌ها پاک می‌شوند. حذف حساب مدیران فرایند کنترل‌شده دارد."],
      ["۱۱. کوکی و ذخیره‌سازی محلی", "کوکی‌ها و فضای ذخیره‌سازی ضروری برای نشست، امنیت، زبان و انتخاب‌های حریم خصوصی استفاده می‌شوند. تحلیل اختیاری فقط مطابق انتخاب ثبت‌شدهٔ کاربر فعال می‌شود."],
      ["۱۲. حقوق شما", "با رعایت شرایط GDPR می‌توانید دسترسی، اصلاح، حذف، محدودیت، انتقال‌پذیری یا اعتراض به پردازش مبتنی بر منفعت مشروع را درخواست کنید. رضایت برای آینده قابل پس‌گرفتن است و حق شکایت نزد مرجع نظارتی صالح نیز وجود دارد."],
      ["۱۳. کنترل خودکار سوءاستفاده", "فارگو با محدودیت نرخ، وضعیت تأیید و سیگنال‌های امنیتی درخواست‌های خودکار یا انبوه را مسدود می‌کند. تصمیم‌های مهم مدیریتی همچنان توسط نیروی مجاز قابل بازبینی هستند."],
      ["۱۴. تغییرات", "تغییرات مهم در همین صفحه منتشر می‌شوند و در صورت الزام، پیش از اجرا از طریق حساب یا ایمیل اطلاع داده خواهند شد."],
    ],
  },
} as const;

export async function generateMetadata() {
  const locale = await getLocale();
  const copy = policy[locale === "fa" ? "fa" : locale === "en" ? "en" : "de"];
  return { title: copy.title, description: copy.intro };
}

export default async function PrivacyPolicyPage() {
  const locale = await getLocale();
  const copy = policy[locale === "fa" ? "fa" : locale === "en" ? "en" : "de"];
  const config = getPublicLegalConfig();
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="rounded-3xl bg-slate-950 p-7 text-white sm:p-10">
        <h1 className="text-3xl font-black sm:text-4xl">{copy.title}</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-300">{copy.intro}</p>
        <p className="mt-4 text-sm font-bold text-sky-300">{copy.updated}</p>
      </header>
      <div className="mt-8 space-y-4">
        {copy.sections.map(([title, body]) => (
          <section key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-black">{title}</h2>
            <p className="mt-3 leading-7 text-slate-600">{body}</p>
          </section>
        ))}
      </div>
      <section className="mt-8 rounded-2xl border border-sky-200 bg-sky-50 p-6">
        <h2 className="font-black">Privacy contact</h2>
        {config.controllerName ? <p className="mt-2">{config.controllerName}</p> : null}
        {config.controllerAddress ? <p className="whitespace-pre-line">{config.controllerAddress}</p> : null}
        {config.privacyEmail ? <a className="mt-2 inline-block font-bold text-primary" href={`mailto:${config.privacyEmail}`}>{config.privacyEmail}</a> : null}
        {config.supervisoryAuthority ? <p className="mt-4 text-sm">{config.supervisoryAuthority}</p> : null}
      </section>
    </main>
  );
}
