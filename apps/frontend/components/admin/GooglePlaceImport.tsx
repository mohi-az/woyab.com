"use client";

import { useLocale } from "next-intl";
import { useState } from "react";
import { FiAlertTriangle, FiCheck, FiExternalLink, FiImage, FiLoader, FiMapPin, FiSearch, FiStar } from "react-icons/fi";

import type { BusinessHourValue } from "@/components/dashboard/BusinessHoursEditor";

type Attribution = {
  displayName: string;
  uri: string | null;
  photoUri: string | null;
};

export type GooglePlaceImportData = {
  placeId: string;
  displayName: string;
  displayNameLanguageCode: string;
  formattedAddress: string;
  city: string | null;
  district: string | null;
  postalCode: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  googleMapsUri: string | null;
  businessStatus: string | null;
  primaryType: string | null;
  primaryTypeLabel: string | null;
  rating: number | null;
  userRatingCount: number;
  hours: BusinessHourValue[];
  weekdayDescriptions: string[];
  hasSplitHours: boolean;
  photos: Array<{
    photoReference: string;
    width: number;
    height: number;
    htmlAttributions: string[];
    authorAttributions: Attribution[];
    googleMapsUri: string | null;
  }>;
  reviews: Array<{
    name: string | null;
    rating: number | null;
    text: string;
    languageCode: string | null;
    relativePublishTimeDescription: string | null;
    publishTime: string | null;
    googleMapsUri: string | null;
    flagContentUri: string | null;
    authorAttribution: Attribution | null;
  }>;
  catalogMatch: {
    city: { id: number; nameEn: string; nameFa: string } | null;
    district: { id: number; nameEn: string | null; nameFa: string } | null;
  };
  duplicate: {
    id: string;
    slug: string;
    businessName: string;
    status: string;
  } | null;
};

type Props = {
  initialPlaceId?: string | null;
  sourceLocale: "DE" | "EN" | "FA";
  editingBusinessId?: string | null;
  onApply: (place: GooglePlaceImportData) => void;
};

const copy = {
  en: {
    title: "Import from Google Place ID",
    hint: "Fetch a compact preview first. Nothing is saved until you apply it and submit the business form.",
    fetch: "Fetch preview",
    apply: "Use these details",
    applied: "Details copied to the editable form",
    placeholder: "ChIJ...",
    invalid: "Enter a valid Google Place ID.",
    failed: "Google Place details could not be loaded.",
    duplicate: "This Place ID already belongs to",
    photos: "Photos",
    reviews: "Google reviews",
    hours: "Opening hours",
    noHours: "No opening hours returned.",
    splitHours: "Some days contain multiple time ranges. They are copied as one range and the original ranges are kept in the day note; verify them before saving.",
    cityUnmatched: "The city was not matched to the internal catalog. Select it manually before saving.",
    outsideGermany: "This place is outside Germany. Verify that it belongs in this directory.",
    relevance: "Google returns a limited review sample ordered by relevance. These reviews are preview-only and are not imported.",
    source: "View on Google Maps",
    type: "Type",
    phone: "Phone",
    postalCode: "Postal code",
    matchedCity: "Matched city",
    website: "Website",
    googleMaps: "Google Maps",
  },
  de: {
    title: "Aus Google Place ID importieren",
    hint: "Zuerst wird eine kompakte Vorschau geladen. Gespeichert wird erst nach Übernahme und Absenden des Formulars.",
    fetch: "Vorschau laden",
    apply: "Daten übernehmen",
    applied: "Daten wurden in das bearbeitbare Formular übernommen",
    placeholder: "ChIJ...",
    invalid: "Geben Sie eine gültige Google Place ID ein.",
    failed: "Google-Place-Daten konnten nicht geladen werden.",
    duplicate: "Diese Place ID gehört bereits zu",
    photos: "Fotos",
    reviews: "Google-Rezensionen",
    hours: "Öffnungszeiten",
    noHours: "Keine Öffnungszeiten verfügbar.",
    splitHours: "Einige Tage enthalten mehrere Zeitfenster. Sie werden als ein Zeitraum übernommen; die Originalzeiten stehen in der Tagesnotiz. Bitte vor dem Speichern prüfen.",
    cityUnmatched: "Die Stadt wurde im internen Katalog nicht gefunden. Bitte vor dem Speichern manuell auswählen.",
    outsideGermany: "Dieser Ort liegt außerhalb Deutschlands. Bitte prüfen Sie, ob er in dieses Verzeichnis gehört.",
    relevance: "Google liefert eine begrenzte, nach Relevanz sortierte Auswahl. Rezensionen werden nur zur Vorschau gezeigt und nicht importiert.",
    source: "Auf Google Maps ansehen",
    type: "Typ",
    phone: "Telefon",
    postalCode: "Postleitzahl",
    matchedCity: "Zugeordnete Stadt",
    website: "Website",
    googleMaps: "Google Maps",
  },
  fa: {
    title: "ورود از Google Place ID",
    hint: "ابتدا یک پیش‌نمایش خلاصه دریافت می‌شود. تا زمان اعمال اطلاعات و ثبت نهایی فرم، چیزی ذخیره نخواهد شد.",
    fetch: "دریافت پیش‌نمایش",
    apply: "اعمال این اطلاعات",
    applied: "اطلاعات به فرم قابل‌ویرایش منتقل شد",
    placeholder: "ChIJ...",
    invalid: "یک Google Place ID معتبر وارد کنید.",
    failed: "دریافت اطلاعات مکان از گوگل انجام نشد.",
    duplicate: "این Place ID قبلاً برای این بیزینس ثبت شده است:",
    photos: "تصاویر",
    reviews: "ریویوهای گوگل",
    hours: "ساعات کاری",
    noHours: "ساعات کاری از گوگل دریافت نشد.",
    splitHours: "بعضی روزها چند بازهٔ کاری دارند. این بازه‌ها به‌صورت یک بازه وارد می‌شوند و زمان اصلی در یادداشت روز نگه داشته می‌شود؛ قبل از ذخیره بررسی کنید.",
    cityUnmatched: "شهر با کاتالوگ داخلی تطبیق داده نشد؛ قبل از ذخیره آن را دستی انتخاب کنید.",
    outsideGermany: "این مکان خارج از آلمان است؛ مطمئن شوید که باید در این دایرکتوری ثبت شود.",
    relevance: "گوگل تعداد محدودی ریویو را بر اساس ارتباط نمایش می‌دهد. ریویوها فقط برای پیش‌نمایش هستند و وارد دیتابیس نمی‌شوند.",
    source: "مشاهده در Google Maps",
    type: "نوع",
    phone: "تلفن",
    postalCode: "کد پستی",
    matchedCity: "شهرِ تطبیق‌داده‌شده",
    website: "وب‌سایت",
    googleMaps: "Google Maps",
  },
} as const;

function responseError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return fallback;
}

export function GooglePlaceImport({ initialPlaceId, sourceLocale, editingBusinessId, onApply }: Props) {
  const locale = useLocale();
  const language = sourceLocale.toLowerCase() as "de" | "en" | "fa";
  const interfaceLanguage = locale === "de" || locale === "fa" ? locale : "en";
  const text = copy[interfaceLanguage];
  const [placeId, setPlaceId] = useState(initialPlaceId ?? "");
  const [place, setPlace] = useState<GooglePlaceImportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);
  const duplicateIsOtherBusiness = Boolean(place?.duplicate && place.duplicate.id !== editingBusinessId);

  async function loadPreview() {
    const normalizedId = placeId.trim();
    if (!/^[A-Za-z0-9_-]{8,255}$/.test(normalizedId)) {
      setError(text.invalid);
      return;
    }

    setLoading(true);
    setError("");
    setApplied(false);
    try {
      const response = await fetch(`/api/place-details/${encodeURIComponent(normalizedId)}?language=${language}`, {
        cache: "no-store",
      });
      const payload = await response.json() as { data?: GooglePlaceImportData } | unknown;
      if (!response.ok || !(payload as { data?: GooglePlaceImportData }).data) {
        throw new Error(responseError(payload, text.failed));
      }
      const details = (payload as { data: GooglePlaceImportData }).data;
      setPlace(details);
      setPlaceId(details.placeId);
    } catch (requestError) {
      setPlace(null);
      setError(requestError instanceof Error ? requestError.message : text.failed);
    } finally {
      setLoading(false);
    }
  }

  function applyDetails() {
    if (!place || duplicateIsOtherBusiness) return;
    onApply(place);
    setApplied(true);
  }

  return (
    <div className="rounded-xl border border-sky-400/25 bg-sky-400/[0.06] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-base font-black text-white">{text.title}</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">{text.hint}</p>
        </div>
        <div className="flex min-w-0 flex-1 gap-2 lg:max-w-xl" dir="ltr">
          <input
            name="googlePlaceId"
            value={placeId}
            onChange={(event) => { setPlaceId(event.target.value); setPlace(null); setApplied(false); setError(""); }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void loadPreview();
              }
            }}
            className="admin-input h-11 min-w-0 flex-1 rounded-lg px-3 text-left text-sm outline-none focus:border-sky-400"
            placeholder={text.placeholder}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => void loadPreview()}
            disabled={loading}
            className="admin-button inline-flex h-11 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-black disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? <FiLoader className="animate-spin" /> : <FiSearch />}
            <span className="hidden sm:inline">{text.fetch}</span>
          </button>
        </div>
      </div>

      {error ? <div className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-200">{error}</div> : null}

      {place ? (
        <div className="mt-4 grid gap-4">
          {duplicateIsOtherBusiness ? (
            <div className="flex items-start gap-2 rounded-lg border border-rose-400/35 bg-rose-500/10 p-3 text-sm text-rose-100">
              <FiAlertTriangle className="mt-0.5 shrink-0" />
              <span>{text.duplicate} <strong>{place.duplicate?.businessName}</strong> ({place.duplicate?.slug})</span>
            </div>
          ) : null}
          {!place.catalogMatch.city ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-400/35 bg-amber-500/10 p-3 text-sm text-amber-100">
              <FiAlertTriangle className="mt-0.5 shrink-0" /><span>{text.cityUnmatched}</span>
            </div>
          ) : null}
          {place.countryCode && place.countryCode !== "DE" ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-400/35 bg-amber-500/10 p-3 text-sm text-amber-100">
              <FiAlertTriangle className="mt-0.5 shrink-0" /><span>{text.outsideGermany}</span>
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-lg border border-white/10 bg-black/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-xl font-black text-white">{place.displayName}</h4>
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-300"><FiMapPin className="mt-0.5 shrink-0" />{place.formattedAddress}</p>
                </div>
                {place.rating !== null ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-3 py-1 text-sm font-black text-amber-300">
                    <FiStar className="fill-current" /> {place.rating.toFixed(1)} ({place.userRatingCount})
                  </span>
                ) : null}
              </div>
              <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                {place.primaryTypeLabel ? <div><dt className="text-slate-500">{text.type}</dt><dd className="font-bold text-slate-200">{place.primaryTypeLabel}</dd></div> : null}
                {place.phone ? <div><dt className="text-slate-500">{text.phone}</dt><dd className="font-bold text-slate-200" dir="ltr">{place.phone}</dd></div> : null}
                {place.postalCode ? <div><dt className="text-slate-500">{text.postalCode}</dt><dd className="font-bold text-slate-200">{place.postalCode}</dd></div> : null}
                {place.catalogMatch.city ? <div><dt className="text-slate-500">{text.matchedCity}</dt><dd className="font-bold text-emerald-300">{place.catalogMatch.city.nameEn}</dd></div> : null}
              </dl>
              <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold">
                {place.website ? <a href={place.website} target="_blank" rel="noreferrer" className="text-sky-300 hover:text-sky-200">{text.website} <FiExternalLink className="inline" /></a> : null}
                {place.googleMapsUri ? <a href={place.googleMapsUri} target="_blank" rel="noreferrer" className="text-sky-300 hover:text-sky-200">{text.source} <FiExternalLink className="inline" /></a> : null}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/10 p-4">
              <h4 className="font-black text-white">{text.hours}</h4>
              {place.weekdayDescriptions.length ? (
                <ul className="mt-2 grid gap-1 text-xs leading-5 text-slate-300">
                  {place.weekdayDescriptions.map((description) => <li key={description}>{description}</li>)}
                </ul>
              ) : <p className="mt-2 text-xs text-slate-400">{text.noHours}</p>}
              {place.hasSplitHours ? <p className="mt-3 rounded-lg bg-amber-400/10 p-2 text-xs leading-5 text-amber-200">{text.splitHours}</p> : null}
            </div>
          </div>

          {place.photos.length ? (
            <section>
              <h4 className="mb-2 flex items-center gap-2 font-black text-white"><FiImage />{text.photos}</h4>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {place.photos.map((photo) => {
                  const sourceUri = photo.googleMapsUri ?? place.googleMapsUri;
                  return (
                    <figure key={photo.photoReference} className="w-52 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/20">
                      {/* Google photo media is short-lived and intentionally bypasses Next's persistent image optimizer cache. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/place-photo?placeId=${encodeURIComponent(place.placeId)}&ref=${encodeURIComponent(photo.photoReference)}&maxWidth=600`}
                        alt=""
                        className="h-32 w-full object-cover"
                        loading="lazy"
                      />
                      <figcaption className="min-h-10 px-2 py-1.5 text-[10px] leading-4 text-slate-400">
                        {photo.authorAttributions.map((author, index) => (
                          <span key={`${author.displayName}-${index}`}>
                            {author.uri ? <a href={author.uri} target="_blank" rel="noreferrer" className="hover:text-sky-300">{author.displayName}</a> : author.displayName}
                            {index < photo.authorAttributions.length - 1 ? ", " : ""}
                          </span>
                        ))}
                        {sourceUri ? <a href={sourceUri} target="_blank" rel="noreferrer" className="ms-2 text-sky-300">{text.googleMaps}</a> : null}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </section>
          ) : null}

          {place.reviews.length ? (
            <section>
              <div className="mb-2">
                <h4 className="font-black text-white">{text.reviews}</h4>
                <p className="mt-1 text-xs text-slate-400">{text.relevance}</p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {place.reviews.map((review, index) => (
                  <article key={review.name ?? index} className="rounded-lg border border-white/10 bg-black/10 p-3">
                    <div className="flex items-center gap-2">
                      {review.authorAttribution?.photoUri ? (
                        // The author avatar is provided by Google and is not persisted locally.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={review.authorAttribution.photoUri} alt="" className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-xs font-black text-white">G</span>}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-white">
                          {review.authorAttribution?.uri ? <a href={review.authorAttribution.uri} target="_blank" rel="noreferrer">{review.authorAttribution.displayName}</a> : review.authorAttribution?.displayName ?? "Google user"}
                        </p>
                        <p className="text-xs text-amber-300">{review.rating !== null ? `${"★".repeat(Math.round(review.rating))} ${review.rating}` : ""} <span className="text-slate-500">{review.relativePublishTimeDescription}</span></p>
                      </div>
                      {review.googleMapsUri ? <a href={review.googleMapsUri} target="_blank" rel="noreferrer" aria-label={text.source} className="text-sky-300"><FiExternalLink /></a> : null}
                    </div>
                    <p className="mt-2 line-clamp-4 text-xs leading-5 text-slate-300">{review.text}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-4">
            {applied ? <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300"><FiCheck />{text.applied}</span> : null}
            <button
              type="button"
              onClick={applyDetails}
              disabled={duplicateIsOtherBusiness}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-black text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <FiCheck />{text.apply}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
