import { getLocale } from "next-intl/server";
import { getPublicLegalConfig } from "@/lib/privacy-config";

const copy = {
  en: {
    title: "Business claims: terms and privacy",
    intro: "These rules apply when you claim a business or suggest changes to a business page on woYab. They explain what you may submit, how ownership is verified, and how the related information is handled.",
    termsLink: "Business terms",
    privacyLink: "Privacy notice",
    termsTitle: "Business Terms of Use",
    termsIntro: "By submitting a claim or edit suggestion, you confirm that the following rules apply to your request.",
    terms: [
      ["1. Scope and eligibility", "These terms cover business claims and edit suggestions on woYab. Claiming a page gives access to woYab's management tools; it does not create, transfer, or prove legal ownership of the business itself."],
      ["2. Authority and truthful information", "You may claim a business only if you own it or are authorized to act for it. Your name, business email, supporting link, and proposed changes must be accurate, current, and not misleading. Employees and customers may suggest edits but do not receive owner access."],
      ["3. Verification and review", "woYab may send a one-time code to the submitted business email, compare the address with the existing listing, request further evidence, or refer the claim to an administrator. Verifying an email does not guarantee approval. The public claim flow does not accept a new claim while a verified owner is assigned; ownership disputes must be raised directly with woYab for an explicit administrative decision."],
      ["4. Business information and submitted content", "You must have the right to submit any text, links, opening hours, services, or other business information. You allow woYab to review, store, format, translate where available, and publish approved information for operating the directory. All changes remain subject to moderation."],
      ["5. Prohibited conduct", "Do not impersonate another person, submit a claim for a competitor, manipulate ratings or reviews, provide forged evidence, upload unlawful or confidential material, interfere with verification, automate abusive requests, or use the process to harass others."],
      ["6. Account security and owner access", "You are responsible for protecting your account and reporting suspected unauthorized access. Owner access is limited to the verified account and cannot be transferred through the owner dashboard. woYab may require a new verification if relevant ownership or security details change."],
      ["7. Moderation, restriction, and cancellation", "woYab may reject, cancel, suspend, or re-review a claim or edit request when information is incomplete, unverifiable, disputed, abusive, or conflicts with these rules or applicable law. Material decisions are recorded for security and accountability."],
      ["8. Public removal and applicable rules", "A verified owner may hide a business from public view and restore it later. This reversible action is separate from a request to erase personal data. German law applies where permitted, while mandatory statutory rights and jurisdiction rules remain unaffected."],
    ],
    privacyTitle: "Privacy Notice for Business Claims",
    privacyIntro: "This notice covers the personal information used for claims, ownership verification, edit suggestions, moderation, and related security checks.",
    controller: "Controller and privacy contact",
    privacy: [
      ["1. Information we process", "We process your account identifier, account email, full name, official business email, optional official website or social-media link, claim and edit contents, verification status, moderation decisions, timestamps, and limited technical and anti-abuse information. A business email may still be personal data when it identifies an individual."],
      ["2. Where the information comes from", "Information comes from you, your woYab account, the existing public business page, verification results, and records created by authorized moderators. We do not visit an optional supporting link to prove ownership."],
      ["3. Purposes and legal bases", "Information needed to process your requested claim and owner access is handled for the requested service and pre-contractual steps under Article 6(1)(b) GDPR. Listing integrity, fraud prevention, security, dispute handling, and audit records rely on woYab's legitimate interests under Article 6(1)(f). Where retention or disclosure is legally required, Article 6(1)(c) applies. The claim does not rely on optional marketing consent."],
      ["4. Required and optional information", "Your name, account email, and business email are required for an ownership claim. The official website or social-media link is optional. Without required information or a successful email verification, woYab cannot complete the claim. Employee and customer suggestions require only the information needed to review the proposed change."],
      ["5. Automated routing and human review", "If a business has no owner and the verified non-Gmail address exactly matches the email already shown on the listing, the system may approve the claim automatically. New addresses and Gmail addresses are sent to administrator review. The public workflow blocks claims for a business with an assigned owner; you may contact woYab directly to report an ownership dispute or request human review."],
      ["6. Recipients", "Access is limited to authorized woYab administrators and service providers needed for hosting, database operation, authentication, security, and delivery of the verification email. Information may also be disclosed when required by law or necessary to establish, exercise, or defend legal claims. The OTP is sent only to the submitted business email."],
      ["7. Retention", "Expired or cancelled claims are scheduled for review after 90 days. Rejected claims and closed edit requests are reviewed after 180 days. Approved claims are kept while ownership access remains active; after it ends, records needed for disputes are reviewed under the standard German limitation period. A documented legal hold must have a reason and an end date. Eligible records are then anonymized or deleted."],
      ["8. Security", "Raw verification codes are never stored. Only a protected hash is retained for the short verification period. Attempts, resend limits, access controls, and audit records are used to reduce account takeover, impersonation, and competing-claim abuse."],
      ["9. Your rights", "Subject to the legal conditions, you may request access, correction, erasure, restriction, portability, or object to processing based on legitimate interests. You may also complain to the competent supervisory authority. Hiding a business page is not the same as exercising a personal-data erasure right, and erasure requests are assessed separately."],
    ],
    authority: "Competent supervisory authority",
  },
  de: {
    title: "Unternehmensansprüche: Bedingungen und Datenschutz",
    intro: "Diese Regeln gelten, wenn Sie auf woYab ein Unternehmen beanspruchen oder Änderungen an einem Unternehmensprofil vorschlagen. Sie erläutern zulässige Angaben, die Prüfung der Inhaberschaft und den Umgang mit den dabei verwendeten Daten.",
    termsLink: "Unternehmensbedingungen",
    privacyLink: "Datenschutzhinweis",
    termsTitle: "Nutzungsbedingungen für Unternehmen",
    termsIntro: "Mit dem Absenden eines Anspruchs oder Änderungsvorschlags bestätigen Sie die folgenden Regeln.",
    terms: [
      ["1. Geltungsbereich und Voraussetzungen", "Diese Bedingungen gelten für Unternehmensansprüche und Änderungsvorschläge auf woYab. Das Beanspruchen eines Profils ermöglicht die Nutzung der woYab-Verwaltungsfunktionen; es begründet, überträgt oder beweist kein rechtliches Eigentum am Unternehmen selbst."],
      ["2. Berechtigung und richtige Angaben", "Sie dürfen ein Unternehmen nur beanspruchen, wenn Sie dessen Inhaber sind oder wirksam für das Unternehmen handeln dürfen. Name, Geschäfts-E-Mail, Beleg-Link und Änderungsvorschläge müssen richtig, aktuell und nicht irreführend sein. Beschäftigte und Kunden können Änderungen vorschlagen, erhalten dadurch aber keinen Inhaberzugang."],
      ["3. Verifizierung und Prüfung", "woYab kann einen Einmalcode an die angegebene Geschäfts-E-Mail senden, die Adresse mit dem bestehenden Eintrag vergleichen, weitere Nachweise anfordern oder den Anspruch einer Admin-Prüfung zuführen. Eine bestätigte E-Mail garantiert keine Freigabe. Solange ein bestätigter Inhaber zugeordnet ist, nimmt der öffentliche Claim-Prozess keinen neuen Anspruch an; Streitfälle müssen direkt bei woYab für eine ausdrückliche Admin-Entscheidung gemeldet werden."],
      ["4. Unternehmensangaben und eingereichte Inhalte", "Sie müssen berechtigt sein, Texte, Links, Öffnungszeiten, Leistungen und sonstige Unternehmensangaben einzureichen. Sie gestatten woYab, diese Angaben für den Betrieb des Verzeichnisses zu prüfen, zu speichern, zu formatieren, soweit verfügbar zu übersetzen und nach Freigabe zu veröffentlichen. Änderungen bleiben moderationspflichtig."],
      ["5. Unzulässige Nutzung", "Untersagt sind insbesondere Identitätstäuschung, Ansprüche für Wettbewerber, Manipulation von Bewertungen, gefälschte Nachweise, rechtswidrige oder vertrauliche Inhalte, Eingriffe in die Verifizierung, automatisierter Missbrauch sowie Belästigung anderer Personen."],
      ["6. Kontosicherheit und Inhaberzugang", "Sie sind für den Schutz Ihres Kontos verantwortlich und müssen einen vermuteten unbefugten Zugriff melden. Der Inhaberzugang ist auf das bestätigte Konto beschränkt und kann nicht über das Inhaber-Dashboard übertragen werden. Bei relevanten Änderungen kann woYab eine erneute Verifizierung verlangen."],
      ["7. Moderation, Einschränkung und Beendigung", "woYab kann Ansprüche oder Änderungsvorschläge ablehnen, stornieren, sperren oder erneut prüfen, wenn Angaben unvollständig, nicht nachprüfbar, streitig, missbräuchlich oder mit diesen Regeln beziehungsweise geltendem Recht unvereinbar sind. Wesentliche Entscheidungen werden aus Sicherheits- und Nachweisgründen protokolliert."],
      ["8. Öffentliches Ausblenden und anwendbare Regeln", "Ein bestätigter Inhaber kann ein Unternehmen öffentlich ausblenden und später wiederherstellen. Diese umkehrbare Maßnahme ist von einem Antrag auf Löschung personenbezogener Daten getrennt. Soweit zulässig gilt deutsches Recht; zwingende gesetzliche Rechte und Zuständigkeitsregeln bleiben unberührt."],
    ],
    privacyTitle: "Datenschutzhinweis für Unternehmensansprüche",
    privacyIntro: "Dieser Hinweis gilt für personenbezogene Daten im Zusammenhang mit Claims, Inhaberverifizierung, Änderungsvorschlägen, Moderation und den zugehörigen Sicherheitsprüfungen.",
    controller: "Verantwortlicher und Datenschutzkontakt",
    privacy: [
      ["1. Verarbeitete Angaben", "Wir verarbeiten Kontokennung, Konto-E-Mail, vollständigen Namen, offizielle Geschäfts-E-Mail, einen optionalen Website- oder Social-Media-Link, Claim- und Änderungsinhalte, Verifizierungsstatus, Moderationsentscheidungen, Zeitangaben sowie begrenzte technische und Missbrauchsschutzdaten. Auch eine geschäftliche E-Mail kann personenbezogen sein, wenn sie eine natürliche Person identifiziert."],
      ["2. Herkunft der Angaben", "Die Angaben stammen von Ihnen, Ihrem woYab-Konto, dem bestehenden öffentlichen Unternehmensprofil, den Ergebnissen der Verifizierung und den Protokollen berechtigter Moderatoren. Ein optionaler Beleg-Link wird nicht serverseitig aufgerufen, um Eigentum nachzuweisen."],
      ["3. Zwecke und Rechtsgrundlagen", "Erforderliche Claim-Daten werden zur Durchführung des angeforderten Verfahrens und vorvertraglicher Schritte gemäß Art. 6 Abs. 1 lit. b DSGVO verarbeitet. Profilintegrität, Betrugsprävention, Sicherheit, Streitbearbeitung und Audit-Protokolle beruhen auf berechtigten Interessen gemäß Art. 6 Abs. 1 lit. f DSGVO. Gesetzlich vorgeschriebene Aufbewahrung oder Offenlegung erfolgt gemäß Art. 6 Abs. 1 lit. c DSGVO. Der Claim stützt sich nicht auf eine optionale Marketing-Einwilligung."],
      ["4. Pflichtangaben und freiwillige Angaben", "Name, Konto-E-Mail und Geschäfts-E-Mail sind für einen Inhaberanspruch erforderlich. Website oder Social-Media-Link sind freiwillig. Ohne Pflichtangaben oder erfolgreiche E-Mail-Verifizierung kann woYab den Anspruch nicht abschließen. Bei Vorschlägen von Beschäftigten und Kunden werden nur die für die Prüfung der Änderung erforderlichen Angaben verlangt."],
      ["5. Automatische Zuordnung und menschliche Prüfung", "Hat das Unternehmen keinen Inhaber und stimmt eine bestätigte Nicht-Gmail-Adresse exakt mit der bereits veröffentlichten E-Mail überein, kann der Anspruch automatisch freigegeben werden. Neue Adressen und Gmail-Adressen werden administrativ geprüft. Ansprüche für Unternehmen mit zugeordnetem Inhaber werden im öffentlichen Ablauf blockiert; bei einem Streitfall können Sie woYab direkt kontaktieren und eine menschliche Prüfung verlangen."],
      ["6. Empfänger", "Zugriff erhalten nur berechtigte woYab-Administratoren und Dienstleister, die für Hosting, Datenbankbetrieb, Authentifizierung, Sicherheit und Zustellung der Verifizierungs-E-Mail erforderlich sind. Eine Offenlegung kann außerdem bei gesetzlicher Pflicht oder zur Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen erfolgen. Der Einmalcode wird ausschließlich an die angegebene Geschäfts-E-Mail gesendet."],
      ["7. Speicherdauer", "Abgelaufene oder stornierte Claims werden nach 90 Tagen zur Prüfung vorgemerkt. Abgelehnte Claims und abgeschlossene Änderungsvorschläge werden nach 180 Tagen geprüft. Bestätigte Claims bleiben während des aktiven Inhaberzugangs gespeichert; anschließend werden für Streitfälle erforderliche Unterlagen nach der regelmäßigen deutschen Verjährungsfrist geprüft. Eine Aufbewahrungssperre benötigt einen dokumentierten Grund und ein Enddatum. Danach werden geeignete Datensätze anonymisiert oder gelöscht."],
      ["8. Sicherheit", "Unverschlüsselte Bestätigungscodes werden niemals gespeichert. Für die kurze Verifizierungsdauer wird nur ein geschützter Hash aufbewahrt. Versuchslimits, Versandsperren, Zugriffskontrollen und Audit-Protokolle dienen dem Schutz vor Kontoübernahmen, Identitätstäuschung und missbräuchlichen Konkurrenz-Claims."],
      ["9. Ihre Rechte", "Unter den gesetzlichen Voraussetzungen können Sie Auskunft, Berichtigung, Löschung, Einschränkung oder Datenübertragbarkeit verlangen und einer Verarbeitung aus berechtigtem Interesse widersprechen. Zudem können Sie sich bei der zuständigen Aufsichtsbehörde beschweren. Das öffentliche Ausblenden eines Unternehmens ist nicht mit der Ausübung des Rechts auf Löschung personenbezogener Daten gleichzusetzen."],
    ],
    authority: "Zuständige Aufsichtsbehörde",
  },
  fa: {
    title: "درخواست مالکیت کسب‌وکار: شرایط استفاده و حریم خصوصی",
    intro: "این قوانین زمانی اجرا می‌شوند که در woYab درخواست مالکیت یک کسب‌وکار را ثبت می‌کنید یا برای صفحهٔ آن پیشنهاد تغییر می‌فرستید. در ادامه حدود استفاده، روش احراز مالکیت و نحوهٔ پردازش اطلاعات توضیح داده شده است.",
    termsLink: "شرایط استفاده کسب‌وکار",
    privacyLink: "اطلاعیهٔ حریم خصوصی",
    termsTitle: "شرایط استفاده برای کسب‌وکارها",
    termsIntro: "با ارسال درخواست مالکیت یا پیشنهاد ویرایش، مقررات زیر را می‌پذیرید.",
    terms: [
      ["۱. دامنه و شرایط استفاده", "این شرایط فقط دربارهٔ درخواست مالکیت و پیشنهاد ویرایش در woYab است. Claim کردن یک صفحه امکان استفاده از ابزارهای مدیریتی woYab را فراهم می‌کند، اما مالکیت حقوقی کسب‌وکار را ایجاد، منتقل یا اثبات نمی‌کند."],
      ["۲. اختیار و صحت اطلاعات", "فقط زمانی می‌توانید درخواست مالکیت بدهید که مالک کسب‌وکار باشید یا اجازهٔ معتبر برای اقدام از طرف آن داشته باشید. نام، ایمیل رسمی، لینک مدرک و تغییرات پیشنهادی باید درست، به‌روز و غیرگمراه‌کننده باشند. کارمند و مشتری می‌توانند تغییر پیشنهاد دهند، اما دسترسی مالک دریافت نمی‌کنند."],
      ["۳. احراز و بررسی درخواست", "woYab می‌تواند کد یک‌بارمصرف را به ایمیل رسمی بفرستد، ایمیل را با اطلاعات فعلی صفحه مقایسه کند، مدرک بیشتری بخواهد یا درخواست را برای بررسی مدیر ارسال کند. تأیید ایمیل تضمین‌کنندهٔ پذیرش نیست. تا زمانی که یک مالک تأییدشده به صفحه متصل است، فرایند عمومی درخواست جدیدی نمی‌پذیرد؛ اختلاف مالکیت باید مستقیماً برای تصمیم صریح مدیر به woYab اعلام شود."],
      ["۴. اطلاعات کسب‌وکار و محتوای ارسالی", "باید حق ارسال متن، لینک، ساعات کاری، خدمات و سایر اطلاعات کسب‌وکار را داشته باشید. شما اجازه می‌دهید woYab این اطلاعات را برای ادارهٔ دایرکتوری بررسی، ذخیره، قالب‌بندی، در صورت وجود ترجمه و پس از تأیید منتشر کند. تمام تغییرات همچنان نیازمند بررسی هستند."],
      ["۵. استفاده‌های ممنوع", "جعل هویت، Claim کردن رقیب، دست‌کاری امتیاز یا نظرها، ارائهٔ مدرک جعلی، ارسال محتوای غیرقانونی یا محرمانه، اختلال در احراز، درخواست خودکار و آزاردهنده و استفاده از این فرایند برای مزاحمت ممنوع است."],
      ["۶. امنیت حساب و دسترسی مالک", "مسئولیت محافظت از حساب با شماست و دسترسی مشکوک باید گزارش شود. دسترسی مالک فقط به حساب تأییدشده تعلق دارد و از پنل مالک قابل انتقال نیست. اگر اطلاعات مهم مالکیت یا امنیت تغییر کند، woYab می‌تواند احراز دوباره بخواهد."],
      ["۷. بررسی، محدودسازی و لغو", "اگر اطلاعات ناقص، غیرقابل‌اثبات، مورد اختلاف، سوءاستفاده‌آمیز یا مخالف قانون و این شرایط باشند، woYab می‌تواند درخواست را رد، لغو، مسدود یا دوباره بررسی کند. تصمیم‌های مهم برای امنیت و پاسخ‌گویی در audit ثبت می‌شوند."],
      ["۸. حذف عمومی و مقررات قابل‌اعمال", "مالک تأییدشده می‌تواند صفحهٔ کسب‌وکار را از دید عمومی پنهان و بعداً بازیابی کند. این عملیات قابل‌بازگشت با درخواست حقوقی حذف اطلاعات شخصی متفاوت است. در حدود مجاز، قوانین آلمان اعمال می‌شوند و حقوق الزامی قانونی و قواعد صلاحیت قضایی محفوظ می‌مانند."],
    ],
    privacyTitle: "اطلاعیهٔ حریم خصوصی درخواست مالکیت",
    privacyIntro: "این اطلاعیه اطلاعات شخصی مرتبط با Claim، احراز مالک، پیشنهاد ویرایش، بررسی مدیر و کنترل‌های امنیتی مربوط به آن‌ها را پوشش می‌دهد.",
    controller: "مسئول پردازش و راه ارتباطی حریم خصوصی",
    privacy: [
      ["۱. اطلاعاتی که پردازش می‌کنیم", "شناسه و ایمیل حساب، نام کامل، ایمیل رسمی کسب‌وکار، لینک اختیاری وب‌سایت یا شبکهٔ اجتماعی، محتوای Claim و پیشنهاد تغییر، وضعیت احراز، تصمیم مدیر، زمان رویدادها و مقدار محدودی اطلاعات فنی و ضدسوءاستفاده پردازش می‌شوند. ایمیل کاری نیز وقتی یک شخص طبیعی را مشخص کند می‌تواند دادهٔ شخصی باشد."],
      ["۲. منبع اطلاعات", "اطلاعات از خود شما، حساب woYab، صفحهٔ عمومی فعلی کسب‌وکار، نتیجهٔ احراز و گزارش‌های ثبت‌شده توسط مدیران مجاز به دست می‌آیند. woYab برای اثبات مالکیت، لینک اختیاری مدرک را از سمت سرور باز نمی‌کند."],
      ["۳. هدف و مبنای قانونی", "اطلاعات ضروری Claim برای انجام خدمت درخواستی و اقدامات پیش‌قراردادی بر اساس مادهٔ 6(1)(b) GDPR پردازش می‌شوند. یکپارچگی صفحه‌ها، جلوگیری از تقلب، امنیت، رسیدگی به اختلاف و audit بر منافع مشروع woYab طبق مادهٔ 6(1)(f) متکی هستند. نگهداری یا افشای الزامی قانونی طبق مادهٔ 6(1)(c) انجام می‌شود. این فرایند بر رضایت اختیاری بازاریابی متکی نیست."],
      ["۴. اطلاعات اجباری و اختیاری", "نام، ایمیل حساب و ایمیل رسمی کسب‌وکار برای Claim لازم هستند. لینک وب‌سایت یا شبکهٔ اجتماعی اختیاری است. بدون اطلاعات ضروری یا تأیید ایمیل، woYab نمی‌تواند درخواست مالکیت را کامل کند. برای پیشنهاد کارمند یا مشتری فقط اطلاعات لازم جهت بررسی تغییر دریافت می‌شود."],
      ["۵. مسیریابی خودکار و بررسی انسانی", "اگر کسب‌وکار مالک نداشته باشد و ایمیل تأییدشدهٔ غیر Gmail دقیقاً با ایمیل موجود در صفحه برابر باشد، سیستم می‌تواند Claim را خودکار تأیید کند. ایمیل جدید و Gmail به بررسی مدیر می‌روند. درخواست برای کسب‌وکار دارای مالک در فرایند عمومی مسدود می‌شود؛ برای اعلام اختلاف مالکیت یا درخواست بررسی انسانی می‌توانید مستقیماً با woYab تماس بگیرید."],
      ["۶. دریافت‌کنندگان", "دسترسی به مدیران مجاز woYab و سرویس‌دهندگان ضروری برای میزبانی، دیتابیس، احراز هویت، امنیت و ارسال ایمیل تأیید محدود است. اطلاعات فقط در صورت الزام قانونی یا برای طرح، اعمال یا دفاع از ادعای حقوقی نیز ممکن است افشا شوند. کد یک‌بارمصرف فقط به ایمیل رسمی واردشده ارسال می‌شود."],
      ["۷. مدت نگهداری", "Claim منقضی یا لغوشده پس از ۹۰ روز و Claim ردشده یا پیشنهاد تغییر بسته‌شده پس از ۱۸۰ روز وارد بازبینی می‌شود. Claim تأییدشده تا زمان فعال‌بودن مالکیت نگهداری خواهد شد و پس از پایان آن، سوابق لازم برای اختلاف طبق دورهٔ معمول دعاوی آلمان بازبینی می‌شوند. نگهداری حقوقی باید دلیل و تاریخ پایان داشته باشد. سپس اطلاعات واجد شرایط ناشناس یا حذف می‌شوند."],
      ["۸. امنیت", "کد خام تأیید هرگز ذخیره نمی‌شود و فقط hash محافظت‌شدهٔ آن برای مدت کوتاه احراز نگهداری می‌شود. محدودیت تلاش و ارسال، کنترل دسترسی و audit برای کاهش خطر تصاحب حساب، جعل هویت و Claim رقیب استفاده می‌شوند."],
      ["۹. حقوق شما", "با توجه به شرایط قانونی می‌توانید دسترسی، اصلاح، حذف، محدودسازی یا انتقال اطلاعات را بخواهید و به پردازش مبتنی بر منافع مشروع اعتراض کنید. همچنین حق شکایت نزد مرجع نظارتی صالح را دارید. پنهان‌کردن صفحهٔ عمومی کسب‌وکار با استفاده از حق حذف اطلاعات شخصی یکسان نیست و جداگانه بررسی می‌شود."],
    ],
    authority: "مرجع نظارتی صالح",
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

export default async function BusinessClaimPrivacyPage() {
  const locale = await getLocale();
  const appLocale = locale === "fa" ? "fa" : locale === "en" ? "en" : "de";
  const text = copy[appLocale];
  const config = getPublicLegalConfig();
  const hasController = Boolean(config.controllerName || config.controllerAddress || config.privacyEmail);

  return <main className="mx-auto w-full max-w-4xl px-5 py-14 text-slate-700">
    <header className="rounded-[32px] bg-slate-950 px-6 py-10 text-white sm:px-10">
      <h1 className="text-3xl font-black sm:text-4xl">{text.title}</h1>
      <p className="mt-5 max-w-3xl leading-8 text-slate-300">{text.intro}</p>
      <nav className="mt-7 flex flex-wrap gap-3 text-sm font-black">
        <a href="#business-terms" className="rounded-xl bg-white px-4 py-2.5 text-slate-900 transition hover:bg-slate-100">{text.termsLink}</a>
        <a href="#privacy-notice" className="rounded-xl border border-white/20 px-4 py-2.5 text-white transition hover:bg-white/10">{text.privacyLink}</a>
      </nav>
    </header>

    <LegalGroup id="business-terms" title={text.termsTitle} intro={text.termsIntro} sections={text.terms} />

    <LegalGroup id="privacy-notice" title={text.privacyTitle} intro={text.privacyIntro} sections={text.privacy}>
      {hasController ? <LegalCard title={text.controller} body={<>
        {config.controllerName ? <div>{config.controllerName}</div> : null}
        {config.controllerAddress ? <div className="whitespace-pre-line">{config.controllerAddress}</div> : null}
        {config.privacyEmail ? <a className="mt-2 inline-block font-bold text-primary" href={`mailto:${config.privacyEmail}`}>{config.privacyEmail}</a> : null}
      </>} /> : null}

      {config.supervisoryAuthority ? <LegalCard title={text.authority} body={config.supervisoryAuthorityUrl
        ? <a className="font-bold text-primary" href={config.supervisoryAuthorityUrl} target="_blank" rel="noreferrer">{config.supervisoryAuthority}</a>
        : config.supervisoryAuthority} /> : null}
    </LegalGroup>
  </main>;
}

function LegalGroup({ id, title, intro, sections, children }: {
  id: string;
  title: string;
  intro: string;
  sections: readonly (readonly [string, string])[];
  children?: React.ReactNode;
}) {
  return <section id={id} className="scroll-mt-24 border-b border-slate-200 py-12 last:border-b-0">
    <h2 className="text-3xl font-black text-slate-950">{title}</h2>
    <p className="mt-4 max-w-3xl leading-8">{intro}</p>
    <div className="mt-8 grid gap-5">
      {sections.map(([sectionTitle, body]) => <LegalCard key={sectionTitle} title={sectionTitle} body={body} />)}
      {children}
    </div>
  </section>;
}

function LegalCard({ title, body }: { title: string; body: React.ReactNode }) {
  return <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.04)]">
    <h3 className="text-lg font-black text-slate-950">{title}</h3>
    <div className="mt-3 leading-8">{body}</div>
  </article>;
}
