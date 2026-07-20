"use client";

import { cloneElement, isValidElement, useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import {
  FiBriefcase,
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiExternalLink,
  FiGlobe,
  FiImage,
  FiHelpCircle,
  FiLink,
  FiMapPin,
  FiSliders,
  FiTag,
} from "react-icons/fi";
import { createOwnerBusiness } from "@/lib/owner-actions";
import { BusinessAttributeFields } from "@/components/business/BusinessAttributeFields";
import { BusinessTagFields } from "@/components/business/BusinessTagFields";
import { BusinessHoursEditor } from "@/components/dashboard/BusinessHoursEditor";
import {
  BusinessImageManager,
  googlePhotoUrl,
  type GooglePlacePhoto,
} from "@/components/dashboard/BusinessImageManager";
import { BusinessLocationPicker } from "@/components/location/BusinessLocationPicker";
import { BusinessEditorShell } from "@/components/dashboard/BusinessEditorShell";
import type { BusinessDraft } from "@/components/business/BusinessListingPreview";
import type { BusinessAttributeDefinition } from "@/lib/business-attributes";
import type { BusinessTagOption } from "@/lib/business-tags";
import { Link } from "@/i18n/navigation";
import {
  ownerBusinessWizardErrors,
  ownerBusinessWizardSchema,
  ownerBusinessWizardStepSchema,
} from "@/lib/owner-business-validation";

type Option = {
  id: number;
  nameEn: string | null;
  nameFa: string | null;
};

type SubCategoryOption = Option & { categoryId: number };
type SpecialtyOption = {
  id: number;
  nameEn: string | null;
  nameFa: string;
  subCategoryId: number;
};

type Props = {
  categories: Option[];
  subCategories: SubCategoryOption[];
  specialties: SpecialtyOption[];
  cities: Option[];
  attributeDefinitions: BusinessAttributeDefinition[];
  tagOptions: BusinessTagOption[];
  initialBusinessName?: string;
  initialSourceLocale?: "DE" | "EN" | "FA";
};

const steps = [
  { titleKey: "basics", icon: FiBriefcase },
  { titleKey: "category", icon: FiTag },
  { titleKey: "content", icon: FiGlobe },
  { titleKey: "googlePlace", icon: FiLink },
  { titleKey: "images", icon: FiImage },
  { titleKey: "features", icon: FiSliders },
  { titleKey: "tags", icon: FiTag },
  { titleKey: "location", icon: FiMapPin },
  { titleKey: "hours", icon: FiClock },
] as const;

const locales = ["DE", "EN", "FA"] as const;
type ContentLocale = (typeof locales)[number];
type TranslationDraft = Record<ContentLocale, { businessName: string; shortDescription: string; description: string }>;

function optionLabel(option: Option | SpecialtyOption) {
  return [option.nameEn, option.nameFa].filter(Boolean).join(" / ");
}

function slugify(value: string) {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (normalized || !value.trim()) return normalized;

  let hash = 2166136261;
  for (const character of value.trim()) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return `business-${(hash >>> 0).toString(36)}`;
}

function helpLabel(locale: string) {
  if (locale === "fa") return "راهنمای این فیلد";
  if (locale === "de") return "Hilfe zu diesem Feld";
  return "Help for this field";
}

function Field({
  label,
  children,
  locale,
  required = false,
  help,
  error,
  compact = false,
}: {
  label: string;
  children: React.ReactNode;
  locale: string;
  required?: boolean;
  help?: string;
  error?: string;
  compact?: boolean;
}) {
  const fieldId = useId();
  const [helpOpen, setHelpOpen] = useState(false);
  const control = isValidElement<{ id?: string }>(children)
    ? cloneElement(children, { id: children.props.id ?? fieldId })
    : children;

  return (
    <div className={`relative grid gap-2 ${compact ? "" : "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm focus-within:border-primary/60"}`}>
      <div className="flex min-h-6 flex-wrap items-center gap-2">
        <label htmlFor={fieldId} className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
          {label}{required ? <span className="ms-1 text-rose-600">*</span> : null}
        </label>
        {help ? (
          <span className="relative">
            <button
              type="button"
              aria-label={helpLabel(locale)}
              aria-expanded={helpOpen}
              onClick={() => setHelpOpen((open) => !open)}
              onBlur={() => setHelpOpen(false)}
              className="grid h-6 w-6 place-items-center rounded-full text-slate-400 transition hover:bg-primary/10 hover:text-primary"
            >
              <FiHelpCircle />
            </button>
            {helpOpen ? (
              <span className="absolute start-0 top-8 z-50 w-72 max-w-[calc(100vw-3rem)] rounded-xl border border-slate-200 bg-slate-950 px-3 py-2 text-start text-xs font-medium normal-case leading-6 tracking-normal text-white shadow-xl">
                {help}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
      {control}
      {error ? <p className="text-xs font-bold leading-5 text-slate-950">{error}</p> : null}
    </div>
  );
}

const inputClass = "min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition focus:border-primary [&>option]:bg-white [&>option]:text-slate-950";
const textareaClass = "min-h-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-primary";
const ltrInputClass = `${inputClass} text-left`;

function siteContentLocale(locale: string): ContentLocale {
  return locale === "fa" ? "FA" : locale === "en" ? "EN" : "DE";
}

function localizedText(locale: string) {
  if (locale === "fa") {
    return {
      stepTitles: {
        basics: "اطلاعات اصلی و تماس",
        category: "دسته‌بندی",
        content: "محتوا و ترجمه‌ها",
        googlePlace: "شناسه Google Place",
        images: "تصاویر",
        features: "امکانات",
        tags: "برچسب‌ها",
        location: "موقعیت مکانی",
        hours: "ساعات کاری",
      },
      eyebrow: "ثبت کسب‌وکار برای صاحبان",
      pageTitle: "کسب‌وکار خود را اضافه کنید",
      pageDescription: "اطلاعات کامل کسب‌وکار را برای بررسی ارسال کنید. آگهی تا زمان تأیید تیم Fargo در وضعیت در انتظار باقی می‌ماند.",
      businessName: "نام کسب‌وکار",
      legalName: "نام حقوقی",
      contactTitle: "اطلاعات تماس",
      contactDescription: "اطلاعات تماسی که مشتریان در صفحه عمومی کسب‌وکار مشاهده می‌کنند.",
      email: "ایمیل",
      phone: "تلفن",
      mobile: "موبایل",
      website: "وب‌سایت",
      postalCode: "کد پستی",
      category: "دسته‌بندی",
      city: "شهر",
      subcategory: "زیردسته",
      specialty: "تخصص",
      noSubcategory: "بدون زیردسته",
      noSpecialty: "بدون تخصص",
      shortDescription: "توضیح کوتاه",
      description: "توضیحات کامل",
      googlePlaceId: "شناسه Google Place",
      previous: "قبلی",
      next: "بعدی",
      submit: "ارسال برای بررسی",
      stepCount: (current: number, total: number) => `گام ${current} از ${total}`,
      googleTitle: "Google Place ID کسب‌وکار",
      googleHelp: "شناسه Google Place کسب‌وکار خود را وارد کنید. پس از ورود شناسه، تصاویر موجود در Google Places به‌صورت خودکار دریافت و در پیش‌نمایش نمایش داده می‌شوند.",
      googleLink: "پیدا کردن Place ID در ابزار رسمی گوگل",
      googlePlaceholder: "برای مثال: ChIJ...",
      loadingPhotos: "در حال دریافت تصاویر گوگل…",
      photosFound: "تصاویر گوگل دریافت شد و پیش‌نمایش به‌روز شد.",
      noPhotos: "برای این شناسه تصویری پیدا نشد.",
      photoError: "دریافت تصاویر ناموفق بود. شناسه یا تنظیمات سرویس Google Places را بررسی کنید.",
      backToDashboard: "بازگشت به داشبورد",
      optionalStep: "این گام اختیاری است و می‌توانید بدون تکمیل آن ادامه دهید.",
      googlePlaceHelp: "این شناسه برای دریافت خودکار تصاویر عمومی Google Places استفاده می‌شود و کلید API شما نیست.",
    };
  }
  if (locale === "de") {
    return {
      stepTitles: {
        basics: "Grund- und Kontaktdaten",
        category: "Kategorie",
        content: "Inhalte und Übersetzungen",
        googlePlace: "Google Place ID",
        images: "Bilder",
        features: "Ausstattung",
        tags: "Tags",
        location: "Standort",
        hours: "Öffnungszeiten",
      },
      eyebrow: "Eintrag für Geschäftsinhaber",
      pageTitle: "Unternehmen hinzufügen",
      pageDescription: "Senden Sie einen vollständigen Unternehmenseintrag zur Prüfung. Er bleibt ausstehend, bis das Fargo-Team ihn freigibt.",
      businessName: "Unternehmensname",
      legalName: "Rechtlicher Name",
      contactTitle: "Kontaktdaten",
      contactDescription: "Öffentliche Kontaktdaten, die Kunden im Unternehmenseintrag sehen.",
      email: "E-Mail",
      phone: "Telefon",
      mobile: "Mobil",
      website: "Website",
      postalCode: "Postleitzahl",
      category: "Kategorie",
      city: "Stadt",
      subcategory: "Unterkategorie",
      specialty: "Spezialisierung",
      noSubcategory: "Keine Unterkategorie",
      noSpecialty: "Keine Spezialisierung",
      shortDescription: "Kurzbeschreibung",
      description: "Beschreibung",
      googlePlaceId: "Google Place ID",
      previous: "Zurück",
      next: "Weiter",
      submit: "Zur Prüfung senden",
      stepCount: (current: number, total: number) => `Schritt ${current} von ${total}`,
      googleTitle: "Google Place ID Ihres Unternehmens",
      googleHelp: "Geben Sie die Google Place ID Ihres Unternehmens ein. Verfügbare Google-Places-Bilder werden sofort geladen und in der Vorschau angezeigt.",
      googleLink: "Place ID mit dem offiziellen Google-Tool finden",
      googlePlaceholder: "Zum Beispiel: ChIJ...",
      loadingPhotos: "Google-Bilder werden geladen…",
      photosFound: "Google-Bilder wurden geladen und die Vorschau wurde aktualisiert.",
      noPhotos: "Für diese Place ID wurden keine Bilder gefunden.",
      photoError: "Bilder konnten nicht geladen werden. Prüfen Sie die Place ID oder die Google-Places-Konfiguration.",
      backToDashboard: "Zurück zum Dashboard",
      optionalStep: "Dieser Schritt ist optional und kann übersprungen werden.",
      googlePlaceHelp: "Diese ID wird für öffentliche Google-Places-Fotos verwendet; sie ist kein API-Schlüssel.",
    };
  }
  return {
    stepTitles: {
      basics: "Business and contact details",
      category: "Category",
      content: "Content and translations",
      googlePlace: "Google Place ID",
      images: "Images",
      features: "Amenities and features",
      tags: "Tags",
      location: "Location",
      hours: "Opening hours",
    },
    eyebrow: "Owner listing wizard",
    pageTitle: "Add your business",
    pageDescription: "Submit a complete listing for review. It will remain pending until the Fargo team approves it.",
    businessName: "Business name",
    legalName: "Legal name",
    contactTitle: "Contact information",
    contactDescription: "Public contact details that customers will see on the business page.",
    email: "Email",
    phone: "Phone",
    mobile: "Mobile",
    website: "Website",
    postalCode: "Postal code",
    category: "Category",
    city: "City",
    subcategory: "Subcategory",
    specialty: "Specialty",
    noSubcategory: "No subcategory",
    noSpecialty: "No specialty",
    shortDescription: "Short description",
    description: "Description",
    googlePlaceId: "Google Place ID",
    previous: "Previous",
    next: "Next",
    submit: "Submit for review",
    stepCount: (current: number, total: number) => `Step ${current} of ${total}`,
    googleTitle: "Your business Google Place ID",
    googleHelp: "Enter your business Google Place ID. Available Google Places photos will be fetched immediately and shown in the preview.",
    googleLink: "Find your Place ID with Google's official tool",
    googlePlaceholder: "For example: ChIJ...",
    loadingPhotos: "Loading Google photos…",
    photosFound: "Google photos loaded and the preview was updated.",
    noPhotos: "No photos were found for this Place ID.",
    photoError: "Photos could not be loaded. Check the Place ID or Google Places configuration.",
    backToDashboard: "Back to dashboard",
    optionalStep: "This step is optional; you can continue without completing it.",
    googlePlaceHelp: "This ID is used to fetch public Google Places photos; it is not your API key.",
  };
}

export function OwnerBusinessWizard({
  categories,
  subCategories,
  specialties,
  cities,
  attributeDefinitions,
  tagOptions,
  initialBusinessName = "",
  initialSourceLocale = "DE",
}: Props) {
  const locale = useLocale();
  const text = localizedText(locale);
  const previewLocale = siteContentLocale(locale);

  const [step, setStep] = useState(0);
  const [locationVisited, setLocationVisited] = useState(false);
  const sourceLocale = initialSourceLocale;
  const [translations, setTranslations] = useState<TranslationDraft>(() => ({
    DE: { businessName: initialSourceLocale === "DE" ? initialBusinessName : "", shortDescription: "", description: "" },
    EN: { businessName: initialSourceLocale === "EN" ? initialBusinessName : "", shortDescription: "", description: "" },
    FA: { businessName: initialSourceLocale === "FA" ? initialBusinessName : "", shortDescription: "", description: "" },
  }));
  const [categoryId, setCategoryId] = useState(String(categories[0]?.id ?? ""));
  const [subCategoryId, setSubCategoryId] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [cityId, setCityId] = useState(String(cities[0]?.id ?? ""));
  const [attributeLabels, setAttributeLabels] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [googlePlaceId, setGooglePlaceId] = useState("");
  const [googlePhotos, setGooglePhotos] = useState<GooglePlacePhoto[]>([]);
  const [googlePhotosStatus, setGooglePhotosStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [imageMode, setImageMode] = useState<"google" | "manual">("google");
  const [manualCoverUrl, setManualCoverUrl] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const sourceBusinessName = translations[sourceLocale].businessName;
  const generatedSlug = useMemo(() => slugify(sourceBusinessName), [sourceBusinessName]);
  const visibleSubCategories = useMemo(
    () => subCategories.filter((item) => String(item.categoryId) === categoryId),
    [categoryId, subCategories],
  );
  const visibleSpecialties = useMemo(
    () => specialties.filter((item) => String(item.subCategoryId) === subCategoryId),
    [specialties, subCategoryId],
  );

  useEffect(() => {
    const placeId = googlePlaceId.trim();
    if (placeId.length < 6) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setGooglePhotosStatus("loading");
      try {
        const response = await fetch(`/api/place-photos/${encodeURIComponent(placeId)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("place-photos");
        const result = (await response.json()) as { data?: { photos?: GooglePlacePhoto[] } };
        const photos = result.data?.photos ?? [];
        setGooglePhotos(photos);
        setGooglePhotosStatus(photos.length ? "ready" : "empty");
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setGooglePhotos([]);
        setGooglePhotosStatus("error");
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [googlePlaceId]);

  function updateTranslation(targetLocale: ContentLocale, field: keyof TranslationDraft[ContentLocale], value: string) {
    setTranslations((current) => ({
      ...current,
      [targetLocale]: { ...current[targetLocale], [field]: value },
    }));
  }

  function stepTitle(titleKey: (typeof steps)[number]["titleKey"]) {
    return text.stepTitles[titleKey];
  }

  function goToStep(nextStep: number) {
    let safeStep = Math.max(0, Math.min(steps.length - 1, nextStep));
    if (safeStep > step) {
      if (!formRef.current) return;
      const result = ownerBusinessWizardStepSchema(step, sourceLocale, locale).safeParse(
        Object.fromEntries(new FormData(formRef.current).entries()),
      );
      if (!result.success) {
        const errors = ownerBusinessWizardErrors(result.error);
        setFieldErrors(errors);
        const firstInvalidName = Object.keys(errors)[0];
        const invalidControl = Array.from(
          formRef.current.elements,
        ).find((element) => element instanceof HTMLElement && "name" in element && element.name === firstInvalidName);
        if (invalidControl instanceof HTMLElement) invalidControl.focus();
        return;
      }
      setFieldErrors({});
      safeStep = Math.min(safeStep, step + 1);
    }
    if (safeStep === 7) setLocationVisited(true);
    setStep(safeStep);
  }

  async function submitWizard() {
    if (!formRef.current || submitting) return;
    const formData = new FormData(formRef.current);
    const result = ownerBusinessWizardSchema(sourceLocale, locale).safeParse(
      Object.fromEntries(formData.entries()),
    );
    if (!result.success) {
      const errors = ownerBusinessWizardErrors(result.error);
      setFieldErrors(errors);
      const firstInvalidName = Object.keys(errors)[0];
      const targetStep = Array.from(formRef.current.querySelectorAll<HTMLElement>("[data-step]"))
        .find((section) => Array.from(section.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"))
          .some((control) => control.name === firstInvalidName));
      if (targetStep?.dataset.step) {
        const nextStep = Number(targetStep.dataset.step);
        if (nextStep === 7) setLocationVisited(true);
        setStep(nextStep);
      }
      return;
    }

    setFieldErrors({});
    formData.set("submissionIntent", "owner-business-final-submit");
    setSubmitting(true);
    try {
      await createOwnerBusiness(formData);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCategory = categories.find((item) => String(item.id) === categoryId);
  const selectedCity = cities.find((item) => String(item.id) === cityId);
  const localizedDraft = translations[previewLocale];
  const googleCoverUrl = googlePhotos[0] ? googlePhotoUrl(googlePhotos[0].photoReference, 1200) : undefined;
  const draft: BusinessDraft = {
    locale,
    businessName: localizedDraft.businessName || undefined,
    shortDescription: localizedDraft.shortDescription || undefined,
    description: localizedDraft.description || undefined,
    coverImageUrl: imageMode === "manual" ? manualCoverUrl : googleCoverUrl,
    categoryName: selectedCategory
      ? ((locale === "fa" ? selectedCategory.nameFa : selectedCategory.nameEn) ?? undefined)
      : undefined,
    cityName: selectedCity
      ? ((locale === "fa" ? selectedCity.nameFa : selectedCity.nameEn) ?? undefined)
      : undefined,
    phone: phone || undefined,
    website: website || undefined,
    address: address || undefined,
    attributeLabels,
    tags: selectedTags,
  };

  return (
    <BusinessEditorShell draft={draft}>
      <form
        ref={formRef}
        noValidate
        onChange={(event) => {
          const target = event.target;
          if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
          if (!target.name || !fieldErrors[target.name]) return;
          setFieldErrors((current) => {
            const next = { ...current };
            delete next[target.name];
            return next;
          });
        }}
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,.08)]"
      >
        <div className="grid gap-6 bg-slate-950 p-6 text-white lg:grid-cols-[1fr_360px]">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-primary-light">{text.eyebrow}</p>
              <Link
                href="/business-portal"
                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-bold text-slate-300 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                {locale === "fa" ? <FiArrowRight /> : <FiArrowLeft />} {text.backToDashboard}
              </Link>
            </div>
            <h1 className="mt-3 text-3xl font-black">{text.pageTitle}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{text.pageDescription}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
            {steps.map((item, index) => {
              const Icon = item.icon;
              const active = index === step;
              const complete = index < step;
              return (
                <button
                  key={item.titleKey}
                  type="button"
                  onClick={() => goToStep(index)}
                  className={`flex min-h-16 items-center gap-3 rounded-2xl border px-3 text-start transition ${
                    active
                      ? "border-primary bg-primary text-white"
                      : complete
                        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                        : "border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/12">
                    {complete ? <FiCheck /> : <Icon />}
                  </span>
                  <span className="text-sm font-black">{stepTitle(item.titleKey)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <section data-step="0" className={step === 0 ? "grid gap-4" : "hidden"}>
            <input type="hidden" name="slug" value={generatedSlug} />
            <input type="hidden" name="sourceLocale" value={sourceLocale} />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={text.businessName} locale={locale} required error={fieldErrors[`businessName_${sourceLocale}`]}>
                <input
                  name={`businessName_${sourceLocale}`}
                  value={sourceBusinessName}
                  onChange={(event) => updateTranslation(sourceLocale, "businessName", event.target.value)}
                  minLength={2}
                  maxLength={200}
                  className={inputClass}
                  placeholder="Fargo Cafe"
                />
              </Field>
              <Field label={text.legalName} locale={locale} error={fieldErrors.legalName}>
                <input name="legalName" maxLength={200} className={inputClass} />
              </Field>
            </div>

            <div className="mt-2 border-t border-slate-100 pt-5">
              <h2 className="text-base font-black text-slate-950">{text.contactTitle}</h2>
              <p className="mt-1 text-xs leading-6 text-slate-500">{text.contactDescription}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label={text.email} locale={locale} error={fieldErrors.email}>
                <input name="email" type="email" dir="ltr" maxLength={254} className={ltrInputClass} />
              </Field>
              <Field label={text.phone} locale={locale} error={fieldErrors.phone}>
                <input name="phone" type="tel" dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={30} className={ltrInputClass} />
              </Field>
              <Field label={text.mobile} locale={locale} error={fieldErrors.mobile}>
                <input name="mobile" type="tel" dir="ltr" maxLength={30} className={ltrInputClass} />
              </Field>
              <Field label={text.website} locale={locale} error={fieldErrors.website}>
                <input name="website" type="url" dir="ltr" value={website} onChange={(event) => setWebsite(event.target.value)} maxLength={2048} className={ltrInputClass} placeholder="https://example.com" />
              </Field>
              <Field label={text.postalCode} locale={locale} error={fieldErrors.postalCode}>
                <input name="postalCode" dir="ltr" inputMode="numeric" maxLength={5} className={ltrInputClass} />
              </Field>
            </div>
          </section>

          <section data-step="1" className={step === 1 ? "grid gap-4" : "hidden"}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={text.category} locale={locale} required error={fieldErrors.categoryId}>
                <select
                  name="categoryId"
                  value={categoryId}
                  onChange={(event) => {
                    setCategoryId(event.target.value);
                    setSubCategoryId("");
                    setSpecialtyId("");
                  }}
                  className={inputClass}
                >
                  {categories.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
                </select>
              </Field>
              <Field label={text.city} locale={locale} required error={fieldErrors.cityId}>
                <select name="cityId" value={cityId} onChange={(event) => setCityId(event.target.value)} className={inputClass}>
                  {cities.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
                </select>
              </Field>
              <Field label={text.subcategory} locale={locale} error={fieldErrors.subCategoryId}>
                <select
                  name="subCategoryId"
                  value={subCategoryId}
                  onChange={(event) => {
                    setSubCategoryId(event.target.value);
                    setSpecialtyId("");
                  }}
                  className={inputClass}
                >
                  <option value="">{text.noSubcategory}</option>
                  {visibleSubCategories.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
                </select>
              </Field>
              <Field label={text.specialty} locale={locale} error={fieldErrors.specialtyId}>
                <select name="specialtyId" value={specialtyId} onChange={(event) => setSpecialtyId(event.target.value)} disabled={!subCategoryId} className={inputClass}>
                  <option value="">{text.noSpecialty}</option>
                  {visibleSpecialties.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
                </select>
              </Field>
            </div>
          </section>

          <section data-step="2" className={step === 2 ? "grid gap-4" : "hidden"}>
            <div className="grid gap-4 lg:grid-cols-3">
              {locales.map((item) => (
                <fieldset key={item} className={`rounded-2xl border p-4 ${item === previewLocale ? "border-primary/50 bg-primary/5" : "border-slate-200 bg-slate-50"}`}>
                  <legend className="px-2 text-sm font-black text-slate-700">{item}</legend>
                  <div className="grid gap-3">
                    {item === sourceLocale ? null : (
                      <Field label={text.businessName} locale={locale} compact error={fieldErrors[`businessName_${item}`]}>
                        <input
                          name={`businessName_${item}`}
                          value={translations[item].businessName}
                          onChange={(event) => updateTranslation(item, "businessName", event.target.value)}
                          maxLength={200}
                          className={inputClass}
                          placeholder={text.businessName}
                        />
                      </Field>
                    )}
                    <Field label={text.shortDescription} locale={locale} compact error={fieldErrors[`shortDescription_${item}`]}>
                      <input
                        name={`shortDescription_${item}`}
                        value={translations[item].shortDescription}
                        onChange={(event) => updateTranslation(item, "shortDescription", event.target.value)}
                        maxLength={300}
                        className={inputClass}
                        placeholder={text.shortDescription}
                      />
                    </Field>
                    <Field label={text.description} locale={locale} compact error={fieldErrors[`description_${item}`]}>
                      <textarea
                        name={`description_${item}`}
                        value={translations[item].description}
                        onChange={(event) => updateTranslation(item, "description", event.target.value)}
                        rows={5}
                        maxLength={5000}
                        className={textareaClass}
                        placeholder={text.description}
                      />
                    </Field>
                  </div>
                </fieldset>
              ))}
            </div>
          </section>

          <section data-step="3" className={step === 3 ? "grid gap-5" : "hidden"}>
            <p className="text-xs font-bold text-slate-500">{text.optionalStep}</p>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-black text-slate-950">{text.googleTitle}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{text.googleHelp}</p>
              <a
                href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-black text-primary hover:underline"
              >
                {text.googleLink} <FiExternalLink />
              </a>
            </div>
            <Field label={text.googlePlaceId} locale={locale} help={text.googlePlaceHelp} error={fieldErrors.googlePlaceId}>
              <input
                name="googlePlaceId"
                dir="ltr"
                value={googlePlaceId}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setGooglePlaceId(nextValue);
                  if (nextValue.trim().length < 6) {
                    setGooglePhotos([]);
                    setGooglePhotosStatus("idle");
                  }
                }}
                className={ltrInputClass}
                placeholder={text.googlePlaceholder}
                autoComplete="off"
                maxLength={255}
              />
            </Field>
            {googlePhotosStatus !== "idle" ? (
              <p className={`text-sm font-bold ${googlePhotosStatus === "error" ? "text-rose-600" : googlePhotosStatus === "ready" ? "text-emerald-600" : "text-slate-500"}`}>
                {googlePhotosStatus === "loading"
                  ? text.loadingPhotos
                  : googlePhotosStatus === "ready"
                    ? text.photosFound
                    : googlePhotosStatus === "empty"
                      ? text.noPhotos
                      : text.photoError}
              </p>
            ) : null}
          </section>

          <section data-step="4" className={step === 4 ? "grid gap-4" : "hidden"}>
            <p className="text-xs font-bold text-slate-500">{text.optionalStep}</p>
            <BusinessImageManager
              locale={locale}
              googlePhotos={googlePhotos}
              googlePhotosStatus={googlePhotosStatus}
              imageMode={imageMode}
              onImageModeChange={setImageMode}
              onManualImagesChange={(_urls, coverUrl) => setManualCoverUrl(coverUrl)}
            />
          </section>

          <section data-step="5" className={step === 5 ? "grid gap-4" : "hidden"}>
            <p className="text-xs font-bold text-slate-500">{text.optionalStep}</p>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <BusinessAttributeFields definitions={attributeDefinitions} onValuesChange={setAttributeLabels} />
            </div>
          </section>

          <section data-step="6" className={step === 6 ? "grid gap-4" : "hidden"}>
            <p className="text-xs font-bold text-slate-500">{text.optionalStep}</p>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <BusinessTagFields tags={tagOptions} onSelectionChange={setSelectedTags} />
            </div>
          </section>

          <section data-step="7" className={step === 7 ? "grid gap-4" : "hidden"}>
            <p className="text-xs font-bold text-slate-500">{text.optionalStep}</p>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {locationVisited ? <BusinessLocationPicker portalMode onAddressChange={setAddress} /> : null}
            </div>
          </section>

          <section data-step="8" className={step === 8 ? "grid gap-4" : "hidden"}>
            <p className="text-xs font-bold text-slate-500">{text.optionalStep}</p>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <BusinessHoursEditor />
            </div>
          </section>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <p className="text-sm font-bold text-slate-500">{text.stepCount(step + 1, steps.length)}</p>
            <div className="flex gap-2">
              <button type="button" disabled={step === 0} onClick={() => goToStep(step - 1)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 disabled:opacity-40">
                {locale === "fa" ? <FiChevronRight /> : <FiChevronLeft />} {text.previous}
              </button>
              {step < steps.length - 1 ? (
                <button type="button" onClick={() => goToStep(step + 1)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-white">
                  {text.next} {locale === "fa" ? <FiChevronLeft /> : <FiChevronRight />}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void submitWizard()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60"
                >
                  <FiCheck /> {text.submit}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </BusinessEditorShell>
  );
}
