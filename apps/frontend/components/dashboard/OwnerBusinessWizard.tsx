"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FiBriefcase, FiCheck, FiChevronLeft, FiChevronRight, FiClock, FiGlobe, FiMapPin, FiSliders, FiTag } from "react-icons/fi";
import { createOwnerBusiness } from "@/lib/owner-actions";
import { BusinessAttributeFields } from "@/components/business/BusinessAttributeFields";
import { BusinessTagFields } from "@/components/business/BusinessTagFields";
import { BusinessHoursEditor } from "@/components/dashboard/BusinessHoursEditor";
import { BusinessLocationPicker } from "@/components/location/BusinessLocationPicker";
import type { BusinessAttributeDefinition } from "@/lib/business-attributes";
import type { BusinessTagOption } from "@/lib/business-tags";

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
};

const steps = [
  { titleKey: "ownerSteps.identity", icon: FiBriefcase },
  { titleKey: "ownerSteps.category", icon: FiTag },
  { titleKey: "ownerSteps.content", icon: FiGlobe },
  { titleKey: "features", icon: FiSliders },
  { titleKey: "tags", icon: FiTag },
  { titleKey: "ownerSteps.location", icon: FiMapPin },
  { titleKey: "ownerSteps.hours", icon: FiClock },
] as const;

const locales = ["DE", "EN", "FA"] as const;

function optionLabel(option: Option | SpecialtyOption) {
  return [option.nameEn, option.nameFa].filter(Boolean).join(" / ");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm focus-within:border-primary/60">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}{required ? <span className="text-primary"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

const inputClass = "min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-primary";
const textareaClass = "min-h-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-primary";

function localizedFeatureText(locale: string) {
  if (locale === "fa") return "\u0627\u0645\u06a9\u0627\u0646\u0627\u062a";
  if (locale === "fa") return "امکانات";
  if (locale === "de") return "Ausstattung";
  return "Amenities and features";
}

function localizedTagText(locale: string) {
  if (locale === "fa") return "\u0628\u0631\u0686\u0633\u0628\u200c\u0647\u0627";
  return "Tags";
}

export function OwnerBusinessWizard({ categories, subCategories, specialties, cities, attributeDefinitions, tagOptions }: Props) {
  const tHours = useTranslations("BusinessHours");
  const locale = useLocale();
  const [step, setStep] = useState(0);
  const [sourceLocale, setSourceLocale] = useState<"DE" | "EN" | "FA">("DE");
  const [businessName, setBusinessName] = useState("");
  const generatedSlug = useMemo(() => slugify(businessName), [businessName]);
  const defaultCategoryId = categories[0]?.id ?? "";
  const defaultCityId = cities[0]?.id ?? "";

  return (
    <form action={createOwnerBusiness} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,.08)]">
      <div className="grid gap-6 bg-slate-950 p-6 text-white lg:grid-cols-[1fr_320px]">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-primary-light">Owner listing wizard</p>
          <h1 className="mt-3 text-3xl font-black">Add your business</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Submit a polished listing for review. Your business will stay pending until the Fargo team approves it.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {steps.map((item, index) => {
            const Icon = item.icon;
            const active = index === step;
            const complete = index < step;
            return (
              <button
                key={item.titleKey}
                type="button"
                onClick={() => setStep(index)}
                className={`flex min-h-20 items-center gap-3 rounded-2xl border px-3 text-start transition ${
                  active ? "border-primary bg-primary text-white" : complete ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-white/5 text-slate-300"
                }`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/12">
                  {complete ? <FiCheck /> : <Icon />}
                </span>
                <span className="text-sm font-black">{item.titleKey === "features" ? localizedFeatureText(locale) : item.titleKey === "tags" ? localizedTagText(locale) : tHours(item.titleKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <section className={step === 0 ? "grid gap-4" : "hidden"}>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Business name" required>
              <input name={`businessName_${sourceLocale}`} value={businessName} onChange={(event) => setBusinessName(event.target.value)} required className={inputClass} placeholder="Fargo Cafe" />
            </Field>
            <Field label="Slug" required>
              <input name="slug" defaultValue={generatedSlug} key={generatedSlug} required pattern="[a-z0-9-]+" className={inputClass} placeholder="fargo-cafe" />
            </Field>
            <Field label="Source language" required>
              <select name="sourceLocale" value={sourceLocale} onChange={(event) => setSourceLocale(event.target.value as typeof sourceLocale)} className={inputClass}>
                {locales.map((locale) => <option key={locale} value={locale}>{locale}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Legal name">
            <input name="legalName" className={inputClass} />
          </Field>
        </section>

        <section className={step === 1 ? "grid gap-4" : "hidden"}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Category" required>
              <select name="categoryId" required defaultValue={defaultCategoryId} className={inputClass}>
                {categories.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
              </select>
            </Field>
            <Field label="City" required>
              <select name="cityId" required defaultValue={defaultCityId} className={inputClass}>
                {cities.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
              </select>
            </Field>
            <Field label="Subcategory">
              <select name="subCategoryId" className={inputClass} defaultValue="">
                <option value="">No subcategory</option>
                {subCategories.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
              </select>
            </Field>
            <Field label="Specialty">
              <select name="specialtyId" className={inputClass} defaultValue="">
                <option value="">No specialty</option>
                {specialties.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Email"><input name="email" type="email" className={inputClass} /></Field>
            <Field label="Phone"><input name="phone" className={inputClass} /></Field>
            <Field label="Mobile"><input name="mobile" className={inputClass} /></Field>
            <Field label="Website"><input name="website" className={inputClass} placeholder="https://example.com" /></Field>
            <Field label="Postal code"><input name="postalCode" className={inputClass} /></Field>
          </div>
        </section>

        <section className={step === 2 ? "grid gap-4" : "hidden"}>
          <div className="grid gap-4 lg:grid-cols-3">
            {locales.map((locale) => (
              <fieldset key={locale} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <legend className="px-2 text-sm font-black text-slate-700">{locale}</legend>
                <div className="grid gap-3">
                  {locale === sourceLocale ? null : (
                    <input name={`businessName_${locale}`} className={inputClass} placeholder="Business name" />
                  )}
                  <input name={`shortDescription_${locale}`} className={inputClass} placeholder="Short description" />
                  <textarea name={`description_${locale}`} rows={5} className={textareaClass} placeholder="Description" />
                </div>
              </fieldset>
            ))}
          </div>
        </section>

        <section className={step === 3 ? "grid gap-4" : "hidden"}>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <BusinessAttributeFields definitions={attributeDefinitions} />
          </div>
        </section>

        <section className={step === 4 ? "grid gap-4" : "hidden"}>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <BusinessTagFields tags={tagOptions} />
          </div>
        </section>

        <section className={step === 5 ? "grid gap-4" : "hidden"}>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {step === 5 ? <BusinessLocationPicker /> : null}
          </div>
        </section>

        <section className={step === 6 ? "grid gap-4" : "hidden"}>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <BusinessHoursEditor />
          </div>
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <p className="text-sm font-bold text-slate-500">Step {step + 1} of {steps.length}</p>
          <div className="flex gap-2">
            <button type="button" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 disabled:opacity-40">
              <FiChevronLeft /> Previous
            </button>
            {step < steps.length - 1 ? (
              <button type="button" onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-white">
                Next <FiChevronRight />
              </button>
            ) : (
              <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white">
                <FiCheck /> Submit for review
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
