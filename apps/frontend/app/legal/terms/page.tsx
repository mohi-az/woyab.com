import Link from "next/link";
import { getLocale } from "next-intl/server";
import { isAppLocale, localizePathname } from "@/i18n/config";
import { getPublicLegalConfig } from "@/lib/privacy-config";

const copy = {
  en: {
    title: "Terms of Use & Legal Notice",
    intro: "These Terms govern access to WoYab, a directory for discovering businesses and services in Germany. They apply to visitors, registered users, reviewers, contributors, and business representatives.",
    termsTitle: "Terms of Use",
    terms: [
      ["1. Scope and acceptance", "By accessing WoYab or creating an account, you agree to these Terms. Feature-specific rules, including the Business Claim Terms, supplement these Terms. If a feature-specific rule conflicts with a general rule, the feature-specific rule applies to that feature."],
      ["2. WoYab's role", "WoYab provides a directory, search tools, business pages, reviews, edit suggestions, and ownership-management features. WoYab is not the operator, agent, employer, or representative of listed businesses and does not endorse or guarantee their products, services, availability, prices, licenses, or conduct."],
      ["3. Accounts and eligibility", "You must provide accurate account information and keep login credentials secure. You are responsible for activity performed through your account. Users who are not legally able to accept these Terms require permission from a parent or legal guardian. Suspected unauthorized access must be reported promptly."],
      ["4. Business listings", "Business pages may combine public information, information supplied by businesses, community suggestions, and third-party sources. Listings may contain errors or become outdated. Businesses and users may propose corrections, but WoYab may verify, moderate, reject, format, translate where available, or remove submitted information."],
      ["5. Reviews and contributions", "Reviews must reflect a genuine experience and remain relevant, factual, and respectful. Undisclosed paid reviews, review trading, coordinated manipulation, conflicts of interest, impersonation, threats, hate, unlawful allegations, confidential information, and personal data about others are prohibited."],
      ["6. Rights in submitted content", "You retain rights you hold in your content. You grant WoYab a non-exclusive, worldwide, royalty-free right to host, store, reproduce, format, adapt for technical display, moderate, and publish the content for operating and promoting the directory. You confirm that you have the necessary rights and permissions to submit it."],
      ["7. Business claims and owner tools", "Claiming a page provides access to WoYab management tools but does not establish legal ownership of the business. Claims are subject to email verification, moderation, competing-claim controls, and the separate Business Claim Terms and Privacy Notice. Owner edits may require administrator approval before publication."],
      ["8. Prohibited use", "You may not scrape or copy the directory at scale, bypass access or rate limits, probe security, distribute malware, automate abusive requests, create deceptive accounts, harvest personal information, interfere with other users, manipulate rankings, or use WoYab for unlawful, fraudulent, or harassing activity."],
      ["9. Moderation and account action", "WoYab may investigate reports and remove content, restrict features, suspend accounts, cancel claims, or preserve evidence when reasonably necessary to enforce these Terms, protect users and listings, comply with law, or defend legal claims. Where appropriate, users may contest a moderation decision through the available contact channel."],
      ["10. Third-party services and links", "WoYab may link to maps, websites, social networks, authentication providers, or other third-party services. Those services operate under their own terms and privacy rules. WoYab is not responsible for third-party content, availability, security, or transactions."],
      ["11. Availability and changes", "WoYab may improve, modify, restrict, or discontinue features. Continuous, error-free availability is not guaranteed. Material changes to these Terms apply prospectively and will be communicated in an appropriate manner before they become binding where required."],
      ["12. Liability", "WoYab remains fully liable for intent, gross negligence, injury to life, body or health, guarantees expressly given, and mandatory statutory liability. For slight negligence affecting an essential contractual duty, liability is limited to foreseeable damage typical for the agreement. Further liability is excluded to the extent permitted by law."],
      ["13. Applicable law and final provisions", "German law applies to the extent permitted. Mandatory consumer protections and statutory jurisdiction rules remain unaffected. If one provision is invalid, the remaining provisions continue to apply. Failure to enforce a provision is not a waiver of that provision."],
    ],
    relatedTitle: "Business claims and edit suggestions",
    relatedText: "Additional rules and the relevant privacy information apply when you claim a business or suggest a change.",
    relatedLink: "Read the Business Claim Terms and Privacy Notice",
    legalTitle: "Legal Notice",
    legalIntro: "Provider information for WoYab is shown below when configured for the public deployment.",
    operator: "Service provider and contact",
    contentResponsibility: "Content responsibility",
    contentResponsibilityText: "The service provider named above is responsible for WoYab's own editorial content. Business information and user contributions are identified and moderated according to their origin and the applicable legal requirements.",
  },
  de: {
    title: "Nutzungsbedingungen & Impressum",
    intro: "Diese Bedingungen regeln die Nutzung von WoYab, einem Verzeichnis zum Auffinden von Unternehmen und Dienstleistungen in Deutschland. Sie gelten für Besucher, registrierte Nutzer, Rezensenten, Beitragende und Unternehmensvertreter.",
    termsTitle: "Nutzungsbedingungen",
    terms: [
      ["1. Geltungsbereich und Zustimmung", "Mit dem Zugriff auf WoYab oder der Erstellung eines Kontos stimmen Sie diesen Bedingungen zu. Funktionsbezogene Regeln, insbesondere die Bedingungen für Unternehmensansprüche, ergänzen diese Bedingungen. Bei einem Widerspruch gilt für die betreffende Funktion die speziellere Regel."],
      ["2. Rolle von WoYab", "WoYab stellt ein Verzeichnis, Suchfunktionen, Unternehmensprofile, Bewertungen, Änderungsvorschläge und Verwaltungsfunktionen für Inhaber bereit. WoYab ist weder Betreiber, Vermittler, Arbeitgeber noch Vertreter der gelisteten Unternehmen und übernimmt keine Garantie für deren Produkte, Leistungen, Verfügbarkeit, Preise, Zulassungen oder Verhalten."],
      ["3. Konten und Nutzungsberechtigung", "Kontodaten müssen richtig sein und Zugangsdaten sind sicher aufzubewahren. Sie sind für Aktivitäten über Ihr Konto verantwortlich. Wer diese Bedingungen rechtlich nicht selbst wirksam annehmen kann, benötigt die Zustimmung eines Elternteils oder gesetzlichen Vertreters. Ein vermuteter unbefugter Zugriff ist unverzüglich zu melden."],
      ["4. Unternehmenseinträge", "Unternehmensprofile können öffentliche Informationen, Angaben von Unternehmen, Vorschläge der Community und Informationen aus Drittquellen kombinieren. Einträge können fehlerhaft oder veraltet sein. Korrekturen können vorgeschlagen werden; WoYab darf Angaben prüfen, moderieren, ablehnen, formatieren, soweit verfügbar übersetzen oder entfernen."],
      ["5. Bewertungen und Beiträge", "Bewertungen müssen auf einer echten Erfahrung beruhen und relevant, sachlich und respektvoll bleiben. Verdeckte bezahlte Bewertungen, Bewertungstausch, koordinierte Manipulation, Interessenkonflikte, Identitätstäuschung, Drohungen, Hass, rechtswidrige Behauptungen, vertrauliche Informationen und personenbezogene Daten Dritter sind untersagt."],
      ["6. Rechte an eingereichten Inhalten", "Sie behalten Ihre bestehenden Rechte an Inhalten. Sie räumen WoYab ein nicht ausschließliches, weltweites und unentgeltliches Recht ein, Inhalte für Betrieb und Bewerbung des Verzeichnisses zu hosten, zu speichern, zu vervielfältigen, technisch zu formatieren, zu moderieren und zu veröffentlichen. Sie bestätigen, dass Sie über die erforderlichen Rechte und Erlaubnisse verfügen."],
      ["7. Unternehmensansprüche und Inhaberfunktionen", "Das Beanspruchen eines Profils ermöglicht WoYab-Verwaltungsfunktionen, begründet aber kein rechtliches Eigentum am Unternehmen. Claims unterliegen E-Mail-Verifizierung, Moderation, Schutz vor konkurrierenden Ansprüchen sowie den gesonderten Claim-Bedingungen und Datenschutzhinweisen. Änderungen eines Inhabers können vor Veröffentlichung eine Admin-Freigabe benötigen."],
      ["8. Unzulässige Nutzung", "Untersagt sind insbesondere massenhaftes Scraping oder Kopieren, Umgehen von Zugriffs- oder Ratenbegrenzungen, Sicherheitstests ohne Erlaubnis, Schadsoftware, automatisierter Missbrauch, täuschende Konten, Sammlung personenbezogener Daten, Störung anderer Nutzer, Ranking-Manipulation sowie rechtswidrige, betrügerische oder belästigende Nutzung."],
      ["9. Moderation und Kontomaßnahmen", "WoYab darf Meldungen prüfen, Inhalte entfernen, Funktionen beschränken, Konten sperren, Claims stornieren oder Nachweise sichern, soweit dies zur Durchsetzung dieser Bedingungen, zum Schutz von Nutzern und Einträgen, zur Einhaltung von Recht oder zur Verteidigung von Ansprüchen erforderlich ist. Soweit angemessen kann eine Moderationsentscheidung beanstandet werden."],
      ["10. Dienste und Links Dritter", "WoYab kann auf Karten, Websites, soziale Netzwerke, Authentifizierungsanbieter oder andere Drittangebote verlinken. Für diese gelten deren eigene Bedingungen und Datenschutzregeln. WoYab ist nicht für Inhalte, Verfügbarkeit, Sicherheit oder Geschäfte dieser Drittanbieter verantwortlich."],
      ["11. Verfügbarkeit und Änderungen", "WoYab kann Funktionen verbessern, ändern, einschränken oder einstellen. Eine ununterbrochene und fehlerfreie Verfügbarkeit wird nicht zugesichert. Wesentliche Änderungen dieser Bedingungen gelten für die Zukunft und werden, soweit erforderlich, vor ihrer Verbindlichkeit angemessen mitgeteilt."],
      ["12. Haftung", "WoYab haftet unbeschränkt bei Vorsatz, grober Fahrlässigkeit, Verletzung von Leben, Körper oder Gesundheit, ausdrücklich übernommenen Garantien und zwingender gesetzlicher Haftung. Bei leichter Fahrlässigkeit hinsichtlich einer wesentlichen Vertragspflicht ist die Haftung auf den vertragstypischen vorhersehbaren Schaden begrenzt. Im Übrigen ist die Haftung soweit gesetzlich zulässig ausgeschlossen."],
      ["13. Anwendbares Recht und Schlussbestimmungen", "Soweit zulässig gilt deutsches Recht. Zwingender Verbraucherschutz und gesetzliche Gerichtsstandsregeln bleiben unberührt. Ist eine Bestimmung unwirksam, bleiben die übrigen Bestimmungen wirksam. Die Nichtdurchsetzung einer Bestimmung stellt keinen Verzicht auf sie dar."],
    ],
    relatedTitle: "Unternehmensansprüche und Änderungsvorschläge",
    relatedText: "Für das Beanspruchen eines Unternehmens oder das Vorschlagen einer Änderung gelten zusätzliche Regeln und Datenschutzhinweise.",
    relatedLink: "Claim-Bedingungen und Datenschutzhinweis lesen",
    legalTitle: "Impressum",
    legalIntro: "Die Anbieterangaben für WoYab werden nachfolgend angezeigt, soweit sie für die öffentliche Bereitstellung konfiguriert sind.",
    operator: "Diensteanbieter und Kontakt",
    contentResponsibility: "Inhaltliche Verantwortung",
    contentResponsibilityText: "Der oben genannte Diensteanbieter ist für WoYabs eigene redaktionelle Inhalte verantwortlich. Unternehmensangaben und Nutzerbeiträge werden entsprechend ihrer Herkunft und den geltenden gesetzlichen Vorgaben gekennzeichnet und moderiert.",
  },
  fa: {
    title: "شرایط استفاده و اطلاعات حقوقی",
    intro: "این شرایط نحوهٔ استفاده از WoYab را مشخص می‌کند. WoYab یک دایرکتوری برای یافتن کسب‌وکارها و خدمات در آلمان است و این مقررات برای بازدیدکنندگان، کاربران، نویسندگان نظر، مشارکت‌کنندگان و نمایندگان کسب‌وکارها اجرا می‌شود.",
    termsTitle: "شرایط استفاده",
    terms: [
      ["۱. دامنه و پذیرش شرایط", "با استفاده از WoYab یا ساخت حساب، این شرایط را می‌پذیرید. مقررات مخصوص هر قابلیت، از جمله شرایط درخواست مالکیت کسب‌وکار، مکمل این صفحه هستند. اگر میان مقررات عمومی و مقررات یک قابلیت تعارضی وجود داشته باشد، برای همان قابلیت مقررات اختصاصی اجرا می‌شود."],
      ["۲. نقش WoYab", "WoYab دایرکتوری، جستجو، صفحهٔ کسب‌وکار، نظر کاربران، پیشنهاد ویرایش و ابزار مدیریت مالک را فراهم می‌کند. WoYab مدیر، واسطه، کارفرما یا نمایندهٔ کسب‌وکارهای فهرست‌شده نیست و کیفیت، مجوز، قیمت، موجودبودن یا رفتار آن‌ها را تضمین نمی‌کند."],
      ["۳. حساب و صلاحیت استفاده", "اطلاعات حساب باید درست باشند و باید از اطلاعات ورود خود محافظت کنید. مسئولیت فعالیت‌های انجام‌شده با حساب شما بر عهدهٔ شماست. کسی که از نظر قانونی امکان پذیرش این شرایط را ندارد باید اجازهٔ والد یا نمایندهٔ قانونی داشته باشد. دسترسی مشکوک باید سریع گزارش شود."],
      ["۴. اطلاعات کسب‌وکارها", "صفحه‌های کسب‌وکار می‌توانند ترکیبی از اطلاعات عمومی، اطلاعات ارائه‌شده توسط کسب‌وکار، پیشنهاد کاربران و منابع شخص ثالث باشند. ممکن است اطلاعات اشتباه یا قدیمی شوند. کاربران می‌توانند اصلاح پیشنهاد دهند و WoYab حق بررسی، رد، قالب‌بندی، ترجمه در صورت وجود یا حذف اطلاعات را دارد."],
      ["۵. نظرها و مشارکت کاربران", "نظر باید حاصل تجربهٔ واقعی، مرتبط، محترمانه و تا حد امکان مبتنی بر واقعیت باشد. نظر پولی اعلام‌نشده، تبادل نظر، دست‌کاری هماهنگ، تعارض منافع، جعل هویت، تهدید، نفرت‌پراکنی، ادعای غیرقانونی، اطلاعات محرمانه و دادهٔ شخصی دیگران ممنوع است."],
      ["۶. حقوق محتوای ارسالی", "حقوقی که بر محتوای خود دارید برای شما باقی می‌ماند. برای اداره و معرفی دایرکتوری، اجازه‌ای غیرانحصاری، جهانی و بدون حق امتیاز به WoYab می‌دهید تا محتوا را میزبانی، ذخیره، تکثیر، برای نمایش فنی قالب‌بندی، بررسی و منتشر کند. شما تأیید می‌کنید که حق و اجازهٔ لازم برای ارسال محتوا را دارید."],
      ["۷. Claim و ابزارهای مالک", "Claim کردن صفحه فقط دسترسی به ابزارهای مدیریت WoYab می‌دهد و مالکیت حقوقی کسب‌وکار را ایجاد نمی‌کند. درخواست‌ها مشمول تأیید ایمیل، بررسی مدیر، کنترل Claim رقیب و شرایط و حریم خصوصی جداگانه هستند. تغییرات مالک نیز ممکن است پیش از انتشار به تأیید مدیر نیاز داشته باشند."],
      ["۸. استفاده‌های ممنوع", "جمع‌آوری یا کپی انبوه دایرکتوری، دورزدن محدودیت دسترسی یا نرخ درخواست، آزمایش امنیت بدون اجازه، بدافزار، درخواست خودکار آزاردهنده، حساب فریبنده، جمع‌آوری دادهٔ شخصی، اختلال برای کاربران، دست‌کاری رتبه و استفادهٔ غیرقانونی، متقلبانه یا مزاحمت‌آمیز ممنوع است."],
      ["۹. بررسی محتوا و اقدامات حساب", "WoYab می‌تواند گزارش‌ها را بررسی کند، محتوا را بردارد، قابلیت‌ها را محدود کند، حساب را مسدود کند، Claim را لغو کند یا مدارک را نگه دارد؛ مشروط به اینکه برای اجرای این شرایط، محافظت از کاربران و صفحه‌ها، رعایت قانون یا دفاع از ادعای حقوقی لازم باشد. در موارد مناسب امکان اعتراض به تصمیم مدیریتی وجود دارد."],
      ["۱۰. لینک‌ها و سرویس‌های شخص ثالث", "WoYab ممکن است به نقشه، وب‌سایت، شبکهٔ اجتماعی، سرویس احراز هویت یا سایر خدمات شخص ثالث لینک بدهد. شرایط و حریم خصوصی همان ارائه‌دهنده بر آن خدمات حاکم است و WoYab مسئول محتوا، دسترس‌پذیری، امنیت یا تراکنش‌های آن‌ها نیست."],
      ["۱۱. دسترس‌پذیری و تغییرات", "WoYab می‌تواند قابلیت‌ها را بهبود دهد، تغییر دهد، محدود یا متوقف کند. دسترسی همیشگی و بدون خطا تضمین نمی‌شود. تغییرات مهم این شرایط برای آینده اعمال می‌شوند و در موارد لازم پیش از الزام‌آورشدن به شکل مناسب اطلاع داده خواهند شد."],
      ["۱۲. مسئولیت", "WoYab در موارد عمد، بی‌احتیاطی سنگین، آسیب به جان یا سلامت، تضمین صریح و مسئولیت‌های الزامی قانونی به‌طور کامل مسئول است. در بی‌احتیاطی سبک نسبت به تعهد اصلی، مسئولیت به خسارت قابل‌پیش‌بینی و معمول قرارداد محدود می‌شود. سایر مسئولیت‌ها تا حد مجاز قانونی مستثنا هستند."],
      ["۱۳. قانون قابل‌اعمال و مقررات پایانی", "در حدود مجاز، قانون آلمان اعمال می‌شود. حقوق الزامی مصرف‌کننده و قواعد قانونی صلاحیت قضایی محفوظ هستند. بی‌اعتباری یک بند باعث بی‌اعتباری سایر بندها نمی‌شود و اجرا نکردن یک حق به‌معنای صرف‌نظر از آن نیست."],
    ],
    relatedTitle: "درخواست مالکیت و پیشنهاد ویرایش",
    relatedText: "برای Claim کردن یک کسب‌وکار یا پیشنهاد تغییر، مقررات و اطلاعات حریم خصوصی تکمیلی وجود دارد.",
    relatedLink: "مشاهدهٔ شرایط و حریم خصوصی درخواست مالکیت",
    legalTitle: "اطلاعات حقوقی",
    legalIntro: "اطلاعات ارائه‌دهندهٔ WoYab در صورت تنظیم برای نسخهٔ عمومی، در ادامه نمایش داده می‌شود.",
    operator: "ارائه‌دهنده و راه ارتباطی",
    contentResponsibility: "مسئولیت محتوا",
    contentResponsibilityText: "ارائه‌دهندهٔ معرفی‌شده در بالا مسئول محتوای تحریریه‌ای خود WoYab است. اطلاعات کسب‌وکار و محتوای کاربران با توجه به منبع آن‌ها و الزامات قانونی قابل‌اعمال مشخص و بررسی می‌شوند.",
  },
} as const;

export async function generateMetadata() {
  const locale = await getLocale();
  const appLocale = locale === "fa" ? "fa" : locale === "en" ? "en" : "de";
  const c = copy[appLocale];
  return {
    title: c.title,
    description: c.intro,
    openGraph: {
      title: c.title,
      description: c.intro,
    },
  };
}

export default async function TermsAndLegalPage() {
  const locale = await getLocale();
  const appLocale = locale === "fa" ? "fa" : locale === "en" ? "en" : "de";
  const text = copy[appLocale];
  const config = getPublicLegalConfig();
  const hasOperator = Boolean(config.controllerName || config.controllerAddress || config.privacyEmail);
  const claimHref = localizePathname("/privacy/business-claims", appLocale);

  return <main className="mx-auto w-full max-w-4xl px-5 py-14 text-slate-700">
    <header className="rounded-[32px] bg-slate-950 px-6 py-10 text-white sm:px-10">
      <h1 className="text-3xl font-black sm:text-4xl">{text.title}</h1>
      <p className="mt-5 max-w-3xl leading-8 text-slate-300">{text.intro}</p>
    </header>

    <section className="border-b border-slate-200 py-12">
      <h2 className="text-3xl font-black text-slate-950">{text.termsTitle}</h2>
      <div className="mt-8 grid gap-5">
        {text.terms.map(([title, body]) => <LegalCard key={title} title={title} body={body} />)}
      </div>
      <aside className="mt-8 rounded-3xl border border-primary/20 bg-primary/5 p-6">
        <h3 className="text-lg font-black text-slate-950">{text.relatedTitle}</h3>
        <p className="mt-3 leading-8">{text.relatedText}</p>
        <Link href={claimHref} className="mt-4 inline-flex font-black text-primary transition hover:text-primary-dark">{text.relatedLink}</Link>
      </aside>
    </section>

    {hasOperator ? <section className="py-12">
      <h2 className="text-3xl font-black text-slate-950">{text.legalTitle}</h2>
      <p className="mt-4 leading-8">{text.legalIntro}</p>
      <div className="mt-8 grid gap-5">
        <LegalCard title={text.operator} body={<>
          {config.controllerName ? <div className="font-bold text-slate-950">{config.controllerName}</div> : null}
          {config.controllerAddress ? <div className="mt-2 whitespace-pre-line">{config.controllerAddress}</div> : null}
          {config.privacyEmail ? <a className="mt-2 inline-block font-bold text-primary" href={`mailto:${config.privacyEmail}`}>{config.privacyEmail}</a> : null}
        </>} />
        <LegalCard title={text.contentResponsibility} body={text.contentResponsibilityText} />
      </div>
    </section> : null}
  </main>;
}

function LegalCard({ title, body }: { title: string; body: React.ReactNode }) {
  return <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.04)]">
    <h3 className="text-lg font-black text-slate-950">{title}</h3>
    <div className="mt-3 leading-8">{body}</div>
  </article>;
}
