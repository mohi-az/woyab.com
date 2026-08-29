"use client";

import { useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import { BusinessAttributeFields } from "@/components/business/BusinessAttributeFields";
import { BusinessTagFields } from "@/components/business/BusinessTagFields";
import { BusinessHoursEditor } from "@/components/dashboard/BusinessHoursEditor";
import { BusinessEditorShell } from "@/components/dashboard/BusinessEditorShell";
import type { BusinessDraft } from "@/components/business/BusinessListingPreview";
import type { BusinessAttributeDefinition } from "@/lib/business-attributes";
import type { BusinessTagOption } from "@/lib/business-tags";

type Option = { id: number; nameEn: string | null; nameDe?: string | null; nameFa: string | null };
type SubOption = Option & { categoryId: number };
type DistrictOption = Option & { cityId: number };

type Business = {
  id: string;
  slug: string;
  businessName: string;
  legalName: string | null;
  shortDescription: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  whatsapp: string | null;
  website: string | null;
  instagram: string | null;
  telegram: string | null;
  facebook: string | null;
  youtube: string | null;
  linkedin: string | null;
  address: string | null;
  postalCode: string | null;
  categoryId: number;
  subCategoryId: number | null;
  cityId: number;
  districtId: number | null;
  latitude: number | null;
  longitude: number | null;
  establishedYear: number | null;
  priceRange: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  status: string;
  sourceLocale: string;
  removedAt: Date | null;
  reviewCount: number;
  averageRating: number;
  translations: Array<{ locale: string; businessName: string | null; shortDescription: string | null; description: string | null }>;
  businessHours: Array<{ dayOfWeek: string; openTime: string | null; closeTime: string | null; isClosed: boolean; note: string | null }>;
  attributes: unknown;
  tags: unknown;
  services: Array<{ id: string; title: string; description: string | null; price: number | null; currency: string; duration: number | null; unit: string | null; active: boolean; sortOrder: number }>;
  changeRequests: Array<{ id: string; kind: string }>;
};

type Actions = {
  updateDetails: (formData: FormData) => Promise<void>;
  updateAttributes: (formData: FormData) => Promise<void>;
  updateTags: (formData: FormData) => Promise<void>;
  updateHours: (formData: FormData) => Promise<void>;
  createService: (formData: FormData) => Promise<void>;
  updateService: (formData: FormData) => Promise<void>;
  deactivateService: (formData: FormData) => Promise<void>;
  removeBusiness: (formData: FormData) => Promise<void>;
  restoreBusiness: (formData: FormData) => Promise<void>;
};

type Props = {
  business: Business;
  initialDraft: BusinessDraft;
  attributeDefinitions: BusinessAttributeDefinition[];
  tagOptions: BusinessTagOption[];
  categoryOptions: Option[];
  subCategoryOptions: SubOption[];
  cityOptions: Option[];
  districtOptions: DistrictOption[];
  locale: string;
  actions: Actions;
};

const inputClass = "min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary";
const buttonClass = "min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-black text-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid min-w-56 flex-1 gap-2 text-sm font-bold text-slate-700">
      {label}
      {children}
    </label>
  );
}

function locLabel(item: Option | DistrictOption, locale: string) {
  return locale === "fa"
    ? (item.nameFa ?? item.nameEn ?? "")
    : locale === "de"
      ? (item.nameDe ?? item.nameEn ?? item.nameFa ?? "")
      : (item.nameEn ?? item.nameDe ?? item.nameFa ?? "");
}

export function BusinessEditForm({
  business,
  initialDraft,
  attributeDefinitions,
  tagOptions,
  categoryOptions,
  subCategoryOptions,
  cityOptions,
  districtOptions,
  locale,
  actions,
}: Props) {
  const [draft, setDraft] = useState<BusinessDraft>(initialDraft);
  const offeringsTitle = locale === "fa"
    ? "محصولات، خدمات و حوزه‌های فعالیت"
    : locale === "de"
      ? "Produkte, Dienstleistungen und Tätigkeitsbereiche"
      : "Products, services and areas of activity";

  const patch = (key: keyof BusinessDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  const patchCategory = (id: string) => {
    const cat = categoryOptions.find((c) => String(c.id) === id);
    setDraft((d) => ({
      ...d,
      categoryName: cat ? locLabel(cat, locale) : "",
    }));
  };

  const patchCity = (id: string) => {
    const city = cityOptions.find((c) => String(c.id) === id);
    setDraft((d) => ({
      ...d,
      cityName: city ? locLabel(city, locale) : "",
    }));
  };

  return (
    <BusinessEditorShell draft={draft}>
      <div className="space-y-6">
        {business.removedAt ? (
          <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h2 className="text-xl font-black text-amber-950">This business is hidden from public view</h2>
            <p className="mt-2 text-sm leading-7 text-amber-800">
              Restore it to make the public page available again.
            </p>
            <form action={actions.restoreBusiness} className="mt-5">
              <input type="hidden" name="businessId" value={business.id} />
              <button className="min-h-11 rounded-xl bg-amber-900 px-5 text-sm font-black text-white">
                Restore business
              </button>
            </form>
          </section>
        ) : null}

        {/* Business information */}
        {!business.removedAt ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <form action={actions.updateDetails} className="grid gap-4">
              <input type="hidden" name="businessId" value={business.id} />
              <div>
                <h2 className="text-xl font-black text-slate-950">Business information</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Saving creates a moderated change request; the public page is unchanged until an admin approves it.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Business name">
                  <input
                    name="businessName"
                    defaultValue={business.businessName}
                    required
                    className={inputClass}
                    onChange={patch("businessName")}
                  />
                </Field>
                <Field label="Legal name">
                  <input name="legalName" defaultValue={business.legalName ?? ""} className={inputClass} />
                </Field>
                <Field label="Email">
                  <input name="email" type="email" defaultValue={business.email ?? ""} className={inputClass} onChange={patch("email")} />
                </Field>
                <Field label="Phone">
                  <input name="phone" defaultValue={business.phone ?? ""} className={inputClass} onChange={patch("phone")} />
                </Field>
                <Field label="Mobile">
                  <input name="mobile" defaultValue={business.mobile ?? ""} className={inputClass} onChange={patch("mobile")} />
                </Field>
                <Field label="Website">
                  <input name="website" type="url" defaultValue={business.website ?? ""} className={inputClass} onChange={patch("website")} />
                </Field>
                <Field label="Address">
                  <input name="address" defaultValue={business.address ?? ""} className={inputClass} onChange={patch("address")} />
                </Field>
                <Field label="Postal code">
                  <input name="postalCode" defaultValue={business.postalCode ?? ""} className={inputClass} />
                </Field>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Category
                  <select
                    name="categoryId"
                    defaultValue={business.categoryId}
                    className={inputClass}
                    onChange={(e) => patchCategory(e.target.value)}
                  >
                    {categoryOptions.map((o) => (
                      <option key={o.id} value={o.id}>{locLabel(o, locale)}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Subcategory
                  <select name="subCategoryId" defaultValue={business.subCategoryId ?? ""} className={inputClass}>
                    <option value="">None</option>
                    {subCategoryOptions.map((o) => (
                      <option key={o.id} value={o.id}>{locLabel(o, locale)} · #{o.categoryId}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  City
                  <select
                    name="cityId"
                    defaultValue={business.cityId}
                    className={inputClass}
                    onChange={(e) => patchCity(e.target.value)}
                  >
                    {cityOptions.map((o) => (
                      <option key={o.id} value={o.id}>{locLabel(o, locale)}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  District
                  <select name="districtId" defaultValue={business.districtId ?? ""} className={inputClass}>
                    <option value="">None</option>
                    {districtOptions.map((o) => (
                      <option key={o.id} value={o.id}>{locLabel(o, locale)} · #{o.cityId}</option>
                    ))}
                  </select>
                </label>
                <Field label="Latitude">
                  <input name="latitude" type="number" step="any" min="-90" max="90" defaultValue={business.latitude?.toString() ?? ""} className={inputClass} />
                </Field>
                <Field label="Longitude">
                  <input name="longitude" type="number" step="any" min="-180" max="180" defaultValue={business.longitude?.toString() ?? ""} className={inputClass} />
                </Field>
                <Field label="Established year">
                  <input name="establishedYear" type="number" min="1800" max="2100" defaultValue={business.establishedYear?.toString() ?? ""} className={inputClass} />
                </Field>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Price range
                  <select
                    name="priceRange"
                    defaultValue={business.priceRange ?? ""}
                    className={inputClass}
                    onChange={(e) => setDraft((d) => ({ ...d, priceRange: e.target.value }))}
                  >
                    <option value="">Not specified</option>
                    {["BUDGET", "MODERATE", "EXPENSIVE", "LUXURY"].map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </label>
              </div>
              <Field label="Short description">
                <input
                  name="shortDescription"
                  defaultValue={business.shortDescription ?? ""}
                  className={inputClass}
                  onChange={patch("shortDescription")}
                />
              </Field>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Description
                <textarea
                  name="description"
                  rows={5}
                  defaultValue={business.description ?? ""}
                  className={inputClass}
                  onChange={patch("description")}
                />
              </label>
              {/* Translations */}
              <div className="grid gap-4 border-t border-slate-100 pt-5 lg:grid-cols-3">
                {(["DE", "EN", "FA"] as const)
                  .filter((tl) => tl !== business.sourceLocale)
                  .map((tl) => {
                    const translation = business.translations.find((item) => item.locale === tl);
                    return (
                      <section key={tl} className="grid gap-3 rounded-2xl bg-slate-50 p-4">
                        <h3 className="font-black text-slate-900">{tl} translation</h3>
                        <Field label="Name">
                          <input name={`translation_${tl}_businessName`} defaultValue={translation?.businessName ?? ""} className={inputClass} />
                        </Field>
                        <Field label="Short description">
                          <input name={`translation_${tl}_shortDescription`} defaultValue={translation?.shortDescription ?? ""} className={inputClass} />
                        </Field>
                        <label className="grid gap-2 text-sm font-bold text-slate-700">
                          Description
                          <textarea name={`translation_${tl}_description`} rows={4} defaultValue={translation?.description ?? ""} className={inputClass} />
                        </label>
                      </section>
                    );
                  })}
              </div>
              <div className="flex justify-end">
                <button className={buttonClass}>Submit information for review</button>
              </div>
            </form>
          </section>
        ) : null}

        {/* Attributes */}
        {!business.removedAt ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <form action={actions.updateAttributes}>
              <input type="hidden" name="businessId" value={business.id} />
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-950">Amenities and features</h2>
                <button type="submit" className={buttonClass}>Submit for review</button>
              </div>
              <div className="mt-5">
                <BusinessAttributeFields definitions={attributeDefinitions} values={business.attributes as Parameters<typeof BusinessAttributeFields>[0]["values"]} />
              </div>
            </form>
          </section>
        ) : null}

        {/* Tags */}
        {!business.removedAt ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <form action={actions.updateTags}>
              <input type="hidden" name="businessId" value={business.id} />
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-950">{offeringsTitle}</h2>
                <button type="submit" className={buttonClass}>Submit for review</button>
              </div>
              <div className="mt-5">
                <BusinessTagFields tags={tagOptions} values={business.tags as Parameters<typeof BusinessTagFields>[0]["values"]} />
              </div>
            </form>
          </section>
        ) : null}

        {/* Hours */}
        {!business.removedAt ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <form action={actions.updateHours}>
              <input type="hidden" name="businessId" value={business.id} />
              <BusinessHoursEditor defaultHours={business.businessHours as import("@/components/dashboard/BusinessHoursEditor").BusinessHourValue[]} />
              <div className="mt-5 flex justify-end border-t border-slate-100 pt-5">
                <button type="submit" className={buttonClass}>Submit hours for review</button>
              </div>
            </form>
          </section>
        ) : null}

        {/* Services */}
        {!business.removedAt ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Services and menu</h2>
            <p className="mt-1 text-sm text-slate-500">Create, edit or deactivate services through the moderation queue.</p>
            <div className="mt-5 grid gap-4">
              {business.services.map((service) => (
                <form key={service.id} action={actions.updateService} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
                  <input type="hidden" name="businessId" value={business.id} />
                  <input type="hidden" name="serviceId" value={service.id} />
                  <Field label="Title"><input name="title" defaultValue={service.title} required className={inputClass} /></Field>
                  <Field label="Price"><input name="price" type="number" step="0.01" min="0" defaultValue={service.price?.toString() ?? ""} className={inputClass} /></Field>
                  <Field label="Currency"><input name="currency" defaultValue={service.currency} required maxLength={3} className={inputClass} /></Field>
                  <Field label="Duration (min)"><input name="duration" type="number" min="1" defaultValue={service.duration?.toString() ?? ""} className={inputClass} /></Field>
                  <Field label="Unit"><input name="unit" defaultValue={service.unit ?? ""} className={inputClass} /></Field>
                  <Field label="Sort order"><input name="sortOrder" type="number" defaultValue={String(service.sortOrder)} className={inputClass} /></Field>
                  <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-3">
                    Description
                    <textarea name="description" rows={2} defaultValue={service.description ?? ""} className={inputClass} />
                  </label>
                  <div className="flex flex-wrap gap-2 md:col-span-3">
                    <button className={buttonClass}>Submit edit</button>
                    {service.active ? (
                      <button formAction={actions.deactivateService} className="min-h-11 rounded-xl border border-rose-200 bg-white px-5 text-sm font-black text-rose-700">
                        Request deactivation
                      </button>
                    ) : (
                      <span className="rounded-xl bg-slate-200 px-4 py-3 text-xs font-black text-slate-500">Inactive</span>
                    )}
                  </div>
                </form>
              ))}
              <form action={actions.createService} className="grid gap-3 rounded-2xl border border-dashed border-slate-300 p-4 md:grid-cols-3">
                <input type="hidden" name="businessId" value={business.id} />
                <Field label="New service title"><input name="title" required className={inputClass} /></Field>
                <Field label="Price"><input name="price" type="number" step="0.01" min="0" className={inputClass} /></Field>
                <Field label="Currency"><input name="currency" defaultValue="EUR" required maxLength={3} className={inputClass} /></Field>
                <Field label="Duration (min)"><input name="duration" type="number" min="1" className={inputClass} /></Field>
                <Field label="Unit"><input name="unit" className={inputClass} /></Field>
                <Field label="Sort order"><input name="sortOrder" type="number" defaultValue="0" className={inputClass} /></Field>
                <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-3">
                  Description
                  <textarea name="description" rows={2} className={inputClass} />
                </label>
                <div className="md:col-span-3">
                  <button className={buttonClass}>Submit new service</button>
                </div>
              </form>
            </div>
          </section>
        ) : null}

        {/* Danger zone */}
        {!business.removedAt ? (
          <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <FiTrash2 className="mt-1 text-rose-700" />
              <div>
                <h2 className="text-xl font-black text-rose-950">Remove from public view</h2>
                <p className="mt-2 text-sm leading-7 text-rose-800">
                  This hides the listing immediately without changing its commercial status.
                </p>
              </div>
            </div>
            <form action={actions.removeBusiness} className="mt-5 flex flex-wrap items-end gap-3">
              <input type="hidden" name="businessId" value={business.id} />
              <Field label={`Enter "${business.businessName}" to confirm`}>
                <input name="confirmName" required className={inputClass} />
              </Field>
              <button className="min-h-12 rounded-xl bg-rose-700 px-5 text-sm font-black text-white">
                Remove business
              </button>
            </form>
          </section>
        ) : null}
      </div>
    </BusinessEditorShell>
  );
}
