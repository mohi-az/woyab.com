"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Collapse, ConfigProvider, Modal, Tabs } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { FiAlertCircle, FiCheck, FiClock, FiEdit3, FiEye, FiGlobe, FiInfo, FiLoader, FiMapPin, FiPlus, FiTag } from "react-icons/fi";
import { MdOutlineVerified, MdStar, MdStarBorder, MdVerified } from "react-icons/md";
import { Link } from "@/i18n/navigation";
import { createBusinessDetails, setBusinessFlag, setBusinessStatus, updateBusinessDetails } from "@/lib/admin-actions";
import { AdminSection, AdminTable, StatusBadge, tableClassName, tdClassName, thClassName } from "@/components/admin/AdminPrimitives";
import { AdminMultiSelect, AdminSearchSelect } from "@/components/admin/AdminSearchSelect";
import { BusinessAttributeFields } from "@/components/business/BusinessAttributeFields";
import { BusinessTagFields } from "@/components/business/BusinessTagFields";
import { BusinessHoursEditor, type BusinessHourValue } from "@/components/dashboard/BusinessHoursEditor";
import { BusinessLocationPicker } from "@/components/location/BusinessLocationPicker";
import type { BusinessAttributeDefinition, BusinessAttributeValue } from "@/lib/business-attributes";
import type { BusinessTagOption, BusinessTagValue } from "@/lib/business-tags";

const statuses = ["PENDING", "ACTIVE", "SUSPENDED", "CLOSED", "REJECTED"] as const;
const locales = ["DE", "EN", "FA"] as const;
const inputClassName = "admin-input h-10 rounded-lg px-3 text-sm outline-none focus:border-sky-400";
const textAreaClassName = "admin-input min-h-24 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400";

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

type OwnerOption = {
  value: string;
  label: string;
};

type Translation = {
  locale: "DE" | "EN" | "FA";
  businessName: string;
  shortDescription: string | null;
  description: string | null;
};

export type AdminBusinessRow = {
  id: string;
  slug: string;
  sourceLocale: "DE" | "EN" | "FA";
  businessName: string;
  ownerId: string | null;
  legalName: string | null;
  shortDescription: string | null;
  description: string | null;
  categoryId: number;
  subCategoryId: number | null;
  specialtyId: number | null;
  specialtyIds: number[];
  cityId: number;
  districtId: number | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  postalCode: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  website: string | null;
  status: (typeof statuses)[number];
  verified: boolean;
  featured: boolean;
  businessHours: BusinessHourValue[];
  category: Option;
  subCategory: Option | null;
  city: Option;
  owner: { name: string | null; email: string | null } | null;
  translations: Translation[];
  attributes: BusinessAttributeValue[];
  tags: BusinessTagValue[];
};

type Props = {
  businesses: AdminBusinessRow[];
  total: number;
  page: number;
  totalPages: number;
  categories: Option[];
  subCategories: SubCategoryOption[];
  specialties: SpecialtyOption[];
  cities: Option[];
  ownerOptions: OwnerOption[];
  attributeDefinitions: BusinessAttributeDefinition[];
  tagOptions: BusinessTagOption[];
  canCreate: boolean;
  initialCreateOpen: boolean;
  previousHref: string;
  nextHref: string;
};

type RowUiState = {
  status: AdminBusinessRow["status"];
  verified: boolean;
  featured: boolean;
  pendingStatus: boolean;
  pendingVerified: boolean;
  pendingFeatured: boolean;
};

function optionLabel(option: Option | SpecialtyOption) {
  return [option.nameEn, option.nameFa].filter(Boolean).join(" / ");
}

function translationMap(business: AdminBusinessRow | null) {
  const map = new Map<"DE" | "EN" | "FA", Translation>();
  if (!business) return map;
  for (const translation of business.translations) map.set(translation.locale, translation);
  map.set(business.sourceLocale, {
    locale: business.sourceLocale,
    businessName: business.businessName,
    shortDescription: business.shortDescription,
    description: business.description,
  });
  return map;
}

function emptyBusiness(): AdminBusinessRow | null {
  return null;
}

function stepForField(field: string) {
  if (["slug", "sourceLocale", "status", "categoryId", "cityId"].includes(field)) return 0;
  if (field.startsWith("businessName_")) return 1;
  if (field.startsWith("attribute_") || field === "tagIds") return 2;
  if (field.startsWith("hours_")) return 4;
  return 0;
}

function requiredLabel(label: string) {
  return <span>{label} <span className="text-rose-400">*</span></span>;
}

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

function actionToggleClassName(active: boolean, tone: "verified" | "featured") {
  if (!active) {
    return "grid h-9 w-9 place-items-center rounded-lg border border-[var(--admin-border)] bg-transparent text-[var(--admin-muted)] transition hover:border-sky-300/60 hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-70";
  }

  if (tone === "verified") {
    return "grid h-9 w-9 place-items-center rounded-lg border border-emerald-300 bg-emerald-400 text-slate-950 shadow-[0_0_0_3px_rgba(52,211,153,.18)] transition disabled:cursor-not-allowed disabled:opacity-70";
  }

  return "grid h-9 w-9 place-items-center rounded-lg border border-amber-200 bg-amber-300 text-slate-950 shadow-[0_0_0_3px_rgba(251,191,36,.22)] transition disabled:cursor-not-allowed disabled:opacity-70";
}

function FieldShell({ label, required, error, children }: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`admin-form-field grid min-w-0 gap-2 rounded-lg border p-3 ${error ? "admin-form-field-error" : ""}`}>
      <span className="admin-muted text-xs font-black">{required ? requiredLabel(label) : label}</span>
      {children}
      {error ? <span className="text-xs font-bold text-rose-400">{error}</span> : null}
    </label>
  );
}

export function AdminBusinessGrid({
  businesses,
  total,
  page,
  totalPages,
  categories,
  subCategories,
  specialties,
  cities,
  ownerOptions,
  attributeDefinitions,
  tagOptions,
  canCreate,
  initialCreateOpen,
  previousHref,
  nextHref,
}: Props) {
  const t = useTranslations("Admin");
  const tHours = useTranslations("BusinessHours");
  const locale = useLocale();
  const [editing, setEditing] = useState<AdminBusinessRow | null>(emptyBusiness());
  const [creating, setCreating] = useState(initialCreateOpen);
  const [wizardStep, setWizardStep] = useState(0);
  const [locationPickerMounted, setLocationPickerMounted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [operationError, setOperationError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sourceLocaleDraft, setSourceLocaleDraft] = useState<"DE" | "EN" | "FA">("DE");
  const [rowUiStates, setRowUiStates] = useState<Record<string, RowUiState>>({});
  const modalOpen = creating || Boolean(editing);
  const modalTranslations = useMemo(() => translationMap(editing), [editing]);
  const defaultCategoryId = categories[0]?.id ?? "";
  const defaultCityId = cities[0]?.id ?? "";
  const featureText = localizedFeatureText(locale);
  const tagText = localizedTagText(locale);
  const wizardSteps = [t("businessWizard.identity"), t("businessWizard.translations"), `${featureText} / ${tagText}`, t("businessWizard.location"), t("businessWizard.hours")];
  const cardBasicInfo = locale === "fa" ? "اطلاعات پایه" : "Basic Information";
  const cardTaxonomy = locale === "fa" ? "دسته‌بندی و تخصص" : "Category & Taxonomy";
  const cardContactInfo = locale === "fa" ? "اطلاعات تماس" : "Contact Information";
  const cardTranslations = locale === "fa" ? "ترجمه نام و توضیحات کسب‌وکار" : "Business Translations";

  function changeWizardStep(step: number) {
    setWizardStep(step);
    if (step === 3) setLocationPickerMounted(true);
  }

  function stepHasError(step: number) {
    return Object.keys(errors).some((field) => stepForField(field) === step);
  }

  function uiStateFor(business: AdminBusinessRow): RowUiState {
    return rowUiStates[business.id] ?? {
      status: business.status,
      verified: business.verified,
      featured: business.featured,
      pendingStatus: false,
      pendingVerified: false,
      pendingFeatured: false,
    };
  }

  function patchRowState(businessId: string, patch: Partial<RowUiState>) {
    setRowUiStates((current) => ({
      ...current,
      [businessId]: {
        status: current[businessId]?.status ?? businesses.find((business) => business.id === businessId)?.status ?? "PENDING",
        verified: current[businessId]?.verified ?? businesses.find((business) => business.id === businessId)?.verified ?? false,
        featured: current[businessId]?.featured ?? businesses.find((business) => business.id === businessId)?.featured ?? false,
        pendingStatus: current[businessId]?.pendingStatus ?? false,
        pendingVerified: current[businessId]?.pendingVerified ?? false,
        pendingFeatured: current[businessId]?.pendingFeatured ?? false,
        ...patch,
      },
    }));
  }

  function closeModal() {
    setEditing(null);
    setCreating(false);
    setWizardStep(0);
    setLocationPickerMounted(false);
    setErrors({});
    setSubmitError("");
    setSaving(false);
    setSourceLocaleDraft("DE");
  }

  function openCreate() {
    setEditing(null);
    setCreating(true);
    setWizardStep(0);
    setLocationPickerMounted(false);
    setErrors({});
    setSubmitError("");
    setSaving(false);
    setSourceLocaleDraft("DE");
  }

  function openEdit(business: AdminBusinessRow) {
    setCreating(false);
    setEditing(business);
    setWizardStep(0);
    setLocationPickerMounted(false);
    setErrors({});
    setSubmitError("");
    setSaving(false);
    setSourceLocaleDraft(business.sourceLocale);
  }

  function clearError(field: string) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function handleFieldChange(event: React.ChangeEvent<HTMLFormElement>) {
    const target = event.target as unknown as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const field = target.name;
    if (!field) return;
    clearError(field);
    if (field === "sourceLocale" && ["DE", "EN", "FA"].includes(target.value)) {
      setSourceLocaleDraft(target.value as "DE" | "EN" | "FA");
      setErrors((current) => {
        const next = { ...current };
        delete next.businessName_DE;
        delete next.businessName_EN;
        delete next.businessName_FA;
        return next;
      });
    }
  }

  function validateForm(form: HTMLFormElement) {
    const formData = new FormData(form);
    const nextErrors: Record<string, string> = {};
    const slug = String(formData.get("slug") ?? "").trim();
    const sourceLocale = String(formData.get("sourceLocale") ?? "DE") as "DE" | "EN" | "FA";
    const sourceBusinessNameKey = `businessName_${sourceLocale}`;
    const sourceBusinessName = String(formData.get(sourceBusinessNameKey) ?? "").trim();

    if (!slug) nextErrors.slug = t("validation.required");
    else if (!/^[a-z0-9-]+$/.test(slug)) nextErrors.slug = t("validation.slug");
    if (!formData.get("sourceLocale")) nextErrors.sourceLocale = t("validation.required");
    if (!formData.get("categoryId")) nextErrors.categoryId = t("validation.required");
    if (!formData.get("cityId")) nextErrors.cityId = t("validation.required");
    if (!sourceBusinessName) nextErrors[sourceBusinessNameKey] = t("validation.sourceBusinessName");
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const mobile = String(formData.get("mobile") ?? "").trim();
    const website = String(formData.get("website") ?? "").trim();
    const postalCode = String(formData.get("postalCode") ?? "").trim();

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = t("validation.email");
    if (phone && !/^\+?[0-9\s().-]{6,24}$/.test(phone)) nextErrors.phone = t("validation.phone");
    if (mobile && !/^\+?[0-9\s().-]{6,24}$/.test(mobile)) nextErrors.mobile = t("validation.phone");
    if (website && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(website)) nextErrors.website = t("validation.website");
    if (postalCode && !/^[A-Za-z0-9][A-Za-z0-9\s-]{2,12}$/.test(postalCode)) nextErrors.postalCode = t("validation.postalCode");

    return nextErrors;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const nextErrors = validateForm(event.currentTarget);
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      event.preventDefault();
      changeWizardStep(stepForField(firstError));
    }
  }

  async function submitBusinessDetails(formData: FormData) {
    setSubmitError("");
    setSaving(true);
    try {
      if (creating) await createBusinessDetails(formData);
      else await updateBusinessDetails(formData);
      closeModal();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t("validation.saveFailed"));
      setSaving(false);
    }
  }

  async function submitStatusChange(formData: FormData, business: AdminBusinessRow, previousStatus: AdminBusinessRow["status"]) {
    const nextStatus = String(formData.get("status")) as AdminBusinessRow["status"];
    setOperationError("");
    patchRowState(business.id, { status: nextStatus, pendingStatus: true });

    try {
      await setBusinessStatus(formData);
      patchRowState(business.id, { status: nextStatus, pendingStatus: false });
    } catch (error) {
      patchRowState(business.id, { status: previousStatus, pendingStatus: false });
      setOperationError(error instanceof Error ? error.message : t("validation.saveFailed"));
    }
  }

  async function submitFlagChange(formData: FormData, business: AdminBusinessRow, field: "verified" | "featured", previousValue: boolean) {
    const enabled = String(formData.get("enabled")) === "true";
    const pendingField = field === "verified" ? "pendingVerified" : "pendingFeatured";
    setOperationError("");
    patchRowState(business.id, { [field]: enabled, [pendingField]: true });

    try {
      await setBusinessFlag(formData);
      patchRowState(business.id, { [field]: enabled, [pendingField]: false });
    } catch (error) {
      patchRowState(business.id, { [field]: previousValue, [pendingField]: false });
      setOperationError(error instanceof Error ? error.message : t("validation.saveFailed"));
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-white">{t("businesses.title")}</h1>
        </div>
        {canCreate ? (
          <button type="button" className="admin-button rounded-lg border px-4 py-3 text-sm font-black" onClick={openCreate}>
            <span className="inline-flex items-center gap-2"><FiPlus />{t("actions.addBusiness")}</span>
          </button>
        ) : null}
      </div>

      <AdminSection title={t("businesses.list")}>
        {operationError ? (
          <div className="mb-4 rounded-lg border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-200">
            {operationError}
          </div>
        ) : null}
        <AdminTable>
          <table className={tableClassName}>
            <thead>
              <tr>
                <th className={thClassName}>{t("fields.business")}</th>
                <th className={thClassName}>{t("fields.owner")}</th>
                <th className={thClassName}>{t("fields.category")}</th>
                <th className={thClassName}>{t("fields.status")}</th>
                <th className={thClassName}>{t("fields.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {businesses.map((business) => {
                const ui = uiStateFor(business);
                return (
                <tr key={business.id} className="cursor-pointer" onClick={() => openEdit(business)}>
                  <td className={`${tdClassName} min-w-[260px]`}>
                    <div className="flex items-center gap-3">
                      <span className="admin-icon-button grid h-8 w-8 shrink-0 place-items-center rounded-lg border"><FiEdit3 /></span>
                      <div className="min-w-0">
                        <div className="font-black text-white">{business.businessName}</div>
                        <div className="truncate text-xs text-slate-400">{business.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className={tdClassName}>{business.owner?.name || business.owner?.email || "-"}</td>
                  <td className={tdClassName}>{optionLabel(business.category)}<br /><span className="text-xs text-slate-500">{optionLabel(business.city)}</span></td>
                  <td className={tdClassName}><StatusBadge status={ui.status} /></td>
                  <td className={tdClassName}>
                    <div className="flex min-w-[230px] items-center gap-2" onClick={(event) => event.stopPropagation()}>
                      <form action={(formData) => submitStatusChange(formData, business, ui.status)}>
                        <input type="hidden" name="businessId" value={business.id} />
                        <div className="relative">
                          <select
                            name="status"
                            value={ui.status}
                            disabled={ui.pendingStatus}
                            className="admin-input h-9 w-[118px] rounded-lg px-2 text-xs font-black outline-none focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
                            aria-label={t("fields.status")}
                            aria-busy={ui.pendingStatus}
                            onChange={(event) => {
                              const nextStatus = event.currentTarget.value as AdminBusinessRow["status"];
                              patchRowState(business.id, { status: nextStatus, pendingStatus: true });
                              event.currentTarget.form?.requestSubmit();
                            }}
                          >
                            {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
                          </select>
                          {ui.pendingStatus ? (
                            <FiLoader className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 animate-spin text-sky-300" />
                          ) : null}
                        </div>
                      </form>
                      <form action={(formData) => submitFlagChange(formData, business, "verified", ui.verified)}>
                        <input type="hidden" name="businessId" value={business.id} />
                        <input type="hidden" name="field" value="verified" />
                        <input type="hidden" name="enabled" value={String(!ui.verified)} />
                        <button
                          type="submit"
                          disabled={ui.pendingVerified}
                          className={actionToggleClassName(ui.verified, "verified")}
                          title={ui.verified ? t("actions.unverify") : t("actions.verify")}
                          aria-label={ui.verified ? t("actions.unverify") : t("actions.verify")}
                          aria-pressed={ui.verified}
                          aria-busy={ui.pendingVerified}
                        >
                          {ui.pendingVerified ? <FiLoader className="animate-spin" /> : ui.verified ? <MdVerified className="text-xl" /> : <MdOutlineVerified className="text-xl" />}
                        </button>
                      </form>
                      <form action={(formData) => submitFlagChange(formData, business, "featured", ui.featured)}>
                        <input type="hidden" name="businessId" value={business.id} />
                        <input type="hidden" name="field" value="featured" />
                        <input type="hidden" name="enabled" value={String(!ui.featured)} />
                        <button
                          type="submit"
                          disabled={ui.pendingFeatured}
                          className={actionToggleClassName(ui.featured, "featured")}
                          title={ui.featured ? t("actions.unfeature") : t("actions.feature")}
                          aria-label={ui.featured ? t("actions.unfeature") : t("actions.feature")}
                          aria-pressed={ui.featured}
                          aria-busy={ui.pendingFeatured}
                        >
                          {ui.pendingFeatured ? <FiLoader className="animate-spin" /> : ui.featured ? <MdStar className="text-xl" /> : <MdStarBorder className="text-xl" />}
                        </button>
                      </form>
                      <Link
                        href={`/businesses/${business.slug}`}
                        className="admin-icon-button grid h-9 w-9 place-items-center rounded-lg border"
                        title={t("actions.viewPublic")}
                        aria-label={t("actions.viewPublic")}
                      >
                        <FiEye />
                      </Link>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </AdminTable>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
          <span>{t("pagination.summary", { total, page, totalPages })}</span>
          <div className="flex gap-2">
            <Link href={previousHref} className="admin-secondary-link rounded-lg border px-3 py-2 font-bold">{t("pagination.previous")}</Link>
            <Link href={nextHref} className="admin-secondary-link rounded-lg border px-3 py-2 font-bold">{t("pagination.next")}</Link>
          </div>
        </div>
      </AdminSection>

      <ConfigProvider direction={locale === "fa" ? "rtl" : "ltr"}>
        <Modal
          open={modalOpen}
          onCancel={closeModal}
          footer={null}
          title={(
            <div className="border-b border-[var(--admin-border)] pb-4">
              <h2 className="admin-title text-2xl font-black">{creating ? t("businesses.createTitle") : t("businesses.editTitle")}</h2>
              <p className="admin-muted mt-1.5 text-sm">{creating ? t("businesses.createDescription") : editing?.businessName}</p>
            </div>
          )}
          width={1080}
          centered
          destroyOnClose
          getContainer={false}
          className="admin-business-modal"
        >
            <form action={submitBusinessDetails} onSubmit={handleSubmit} onChange={handleFieldChange} className="max-h-[calc(92vh-150px)] overflow-y-auto pt-4">
              {editing ? <input type="hidden" name="businessId" value={editing.id} /> : null}
              {!locationPickerMounted ? (
                <>
                  <input type="hidden" name="latitude" value={editing?.latitude ?? ""} />
                  <input type="hidden" name="longitude" value={editing?.longitude ?? ""} />
                  <input type="hidden" name="address" value={editing?.address ?? ""} />
                </>
              ) : null}
              <div className="grid gap-6 px-1 pb-1">
                {/* Modern Custom Wizard Steps */}
                <div className="admin-wizard-steps">
                  {wizardSteps.map((label, index) => {
                    const isActive = wizardStep === index;
                    const isCompleted = index < wizardStep;
                    const hasError = stepHasError(index);
                    
                    const StepIcon = [
                      FiInfo,
                      FiGlobe,
                      FiTag,
                      FiMapPin,
                      FiClock,
                    ][index] || FiInfo;

                    return (
                      <div
                        key={index}
                        onClick={() => changeWizardStep(index)}
                        className={`admin-wizard-step ${isActive ? "active" : ""} ${isCompleted && !hasError ? "completed" : ""} ${hasError ? "error" : ""}`}
                      >
                        <div className="admin-wizard-step-bubble">
                          {hasError ? (
                            <FiAlertCircle className="h-5 w-5" />
                          ) : isCompleted ? (
                            <FiCheck className="h-5 w-5" />
                          ) : (
                            <StepIcon className="h-5 w-5" />
                          )}
                        </div>
                        <span className="admin-wizard-step-label">
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {submitError ? (
                  <Alert type="error" showIcon message={submitError} className="mb-4" />
                ) : null}

                {/* Step 0: Identity */}
                <section className={wizardStep === 0 ? "grid gap-6" : "hidden"}>
                  <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <div className="admin-wizard-card-group flex flex-col gap-4">
                      <h3 className="admin-wizard-card-title">{cardBasicInfo}</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FieldShell label={t("fields.slug")} required error={errors.slug}>
                          <input name="slug" defaultValue={editing?.slug ?? ""} className={inputClassName} placeholder="example-business-name" />
                        </FieldShell>
                        <FieldShell label={t("fields.legalName")}>
                          <input name="legalName" defaultValue={editing?.legalName ?? ""} className={inputClassName} />
                        </FieldShell>
                        <FieldShell label={t("fields.sourceLocale")} required error={errors.sourceLocale}>
                          <select name="sourceLocale" defaultValue={editing?.sourceLocale ?? "DE"} className={inputClassName}>
                            {locales.map((item) => <option key={item} value={item}>{item}</option>)}
                          </select>
                        </FieldShell>
                        <input type="hidden" name="status" value={editing?.status ?? "PENDING"} />
                        <input type="hidden" name="verified" value={String(editing?.verified ?? false)} />
                        <input type="hidden" name="featured" value={String(editing?.featured ?? false)} />
                        <FieldShell label={t("fields.owner")}>
                          <AdminSearchSelect
                            name="ownerId"
                            defaultValue={editing?.ownerId ?? ""}
                            allowClear
                            placeholder={t("fields.owner")}
                            options={ownerOptions}
                          />
                        </FieldShell>
                      </div>
                    </div>

                    <div className="admin-wizard-card-group flex flex-col gap-4">
                      <h3 className="admin-wizard-card-title">{cardTaxonomy}</h3>
                      <div className="grid content-start gap-4">
                        <FieldShell label={t("fields.category")} required error={errors.categoryId}>
                          <AdminSearchSelect name="categoryId" defaultValue={editing?.categoryId ?? editing?.category?.id ?? defaultCategoryId} options={categories.map((item) => ({ value: String(item.id), label: optionLabel(item) }))} onValueChange={clearError} />
                        </FieldShell>
                        <FieldShell label={t("fields.subCategory")}>
                          <AdminSearchSelect name="subCategoryId" defaultValue={editing?.subCategoryId ?? editing?.subCategory?.id ?? ""} allowClear options={subCategories.map((item) => ({ value: String(item.id), label: optionLabel(item) }))} />
                        </FieldShell>
                        <FieldShell label={t("fields.specialty")}>
                          <AdminMultiSelect name="specialtyIds" defaultValue={editing?.specialtyIds?.length ? editing.specialtyIds : (editing?.specialtyId ? [editing.specialtyId] : [])} options={specialties.map((item) => ({ value: String(item.id), label: optionLabel(item) }))} />
                        </FieldShell>
                        <FieldShell label={t("fields.city")} required error={errors.cityId}>
                          <AdminSearchSelect name="cityId" defaultValue={editing?.cityId ?? editing?.city?.id ?? defaultCityId} options={cities.map((item) => ({ value: String(item.id), label: optionLabel(item) }))} onValueChange={clearError} />
                        </FieldShell>
                      </div>
                    </div>
                  </div>

                  <div className="admin-wizard-card-group flex flex-col gap-4">
                    <h3 className="admin-wizard-card-title">{cardContactInfo}</h3>
                    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
                      <FieldShell label={t("fields.email")} error={errors.email}>
                        <input name="email" defaultValue={editing?.email ?? ""} className={inputClassName} />
                      </FieldShell>
                      <FieldShell label={t("fields.phone")} error={errors.phone}>
                        <input name="phone" defaultValue={editing?.phone ?? ""} className={inputClassName} />
                      </FieldShell>
                      <FieldShell label={t("fields.mobile")} error={errors.mobile}>
                        <input name="mobile" defaultValue={editing?.mobile ?? ""} className={inputClassName} />
                      </FieldShell>
                      <FieldShell label={t("fields.website")} error={errors.website}>
                        <input name="website" defaultValue={editing?.website ?? ""} className={inputClassName} />
                      </FieldShell>
                      <FieldShell label={t("fields.postalCode")} error={errors.postalCode}>
                        <input name="postalCode" defaultValue={editing?.postalCode ?? ""} className={inputClassName} />
                      </FieldShell>
                    </div>
                  </div>
                </section>

                {/* Step 1: Translations */}
                <section className={wizardStep === 1 ? "grid gap-4" : "hidden"}>
                  <div className="admin-wizard-card-group flex flex-col gap-4">
                    <h3 className="admin-wizard-card-title">{cardTranslations}</h3>
                    <Collapse
                      className="admin-business-collapse border-0 bg-transparent"
                      defaultActiveKey={[sourceLocaleDraft]}
                      items={locales.map((locale) => {
                        const translation = modalTranslations.get(locale);
                        return {
                          key: locale,
                          label: (
                            <span className={errors[`businessName_${locale}`] ? "text-rose-400 font-bold" : ""}>
                              {locale === "FA" ? "Farsi / فارسی" : locale === "DE" ? "German / آلمانی" : "English / انگلیسی"}
                            </span>
                          ),
                          children: (
                            <div className="grid gap-4">
                              <FieldShell label={t("fields.businessName")} required={locale === sourceLocaleDraft} error={errors[`businessName_${locale}`]}>
                                <input name={`businessName_${locale}`} defaultValue={translation?.businessName ?? ""} placeholder={t("fields.businessName")} className={inputClassName} />
                              </FieldShell>
                              <FieldShell label={t("fields.shortDescription")}>
                                <input name={`shortDescription_${locale}`} defaultValue={translation?.shortDescription ?? ""} placeholder={t("fields.shortDescription")} className={inputClassName} />
                              </FieldShell>
                              <FieldShell label={t("fields.description")}>
                                <textarea name={`description_${locale}`} defaultValue={translation?.description ?? ""} placeholder={t("fields.description")} rows={4} className={textAreaClassName} />
                              </FieldShell>
                            </div>
                          ),
                        };
                      })}
                    />
                  </div>
                </section>

                {/* Step 2: Features / Tags */}
                <section className={wizardStep === 2 ? "grid gap-6" : "hidden"}>
                  <div className="admin-wizard-card-group flex flex-col gap-4">
                    <h3 className="admin-wizard-card-title">{tagText}</h3>
                    <BusinessTagFields
                      variant="admin"
                      tags={tagOptions}
                      values={editing?.tags ?? []}
                    />
                  </div>
                  <div className="admin-wizard-card-group flex flex-col gap-4">
                    <h3 className="admin-wizard-card-title">{featureText}</h3>
                    <BusinessAttributeFields
                      variant="admin"
                      definitions={attributeDefinitions}
                      values={editing?.attributes ?? []}
                    />
                  </div>
                </section>

                {/* Step 3: Location */}
                <section className={wizardStep === 3 ? "grid gap-4" : "hidden"}>
                  <div className="admin-wizard-card-group flex flex-col gap-4">
                    <h3 className="admin-wizard-card-title">{t("location.title")}</h3>
                    {locationPickerMounted ? (
                      <BusinessLocationPicker
                        defaultAddress={editing?.address}
                        defaultLatitude={editing?.latitude}
                        defaultLongitude={editing?.longitude}
                      />
                    ) : null}
                  </div>
                </section>

                {/* Step 4: Hours */}
                <section className={wizardStep === 4 ? "grid gap-4" : "hidden"}>
                  <div className="admin-wizard-card-group flex flex-col gap-4">
                    <h3 className="admin-wizard-card-title">{tHours("title")}</h3>
                    <BusinessHoursEditor variant="admin" defaultHours={editing?.businessHours ?? []} />
                  </div>
                </section>

                {/* Sticky Footer Action Buttons */}
                <div className="sticky bottom-0 -mx-1 mt-4 flex flex-wrap justify-between gap-3 border-t border-[var(--admin-border)] bg-[var(--admin-surface)] px-1 py-4 z-20">
                  <Button
                    onClick={closeModal}
                    className="h-10 rounded-lg px-4 border-[var(--admin-border)] hover:bg-white/5 transition-all text-sm font-bold text-[var(--admin-text)]"
                  >
                    {t("actions.cancel")}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      disabled={wizardStep === 0}
                      onClick={() => changeWizardStep(Math.max(0, wizardStep - 1))}
                      className="h-10 rounded-lg px-4 border-[var(--admin-border)] hover:bg-white/5 transition-all text-sm font-bold text-[var(--admin-text)]"
                    >
                      {t("actions.previous")}
                    </Button>
                    <Button
                      disabled={wizardStep === wizardSteps.length - 1}
                      onClick={() => changeWizardStep(Math.min(wizardSteps.length - 1, wizardStep + 1))}
                      className="h-10 rounded-lg px-4 bg-sky-500 hover:bg-sky-400 border-0 text-white font-bold transition-all shadow-md"
                    >
                      {t("actions.next")}
                    </Button>
                    <Button
                      htmlType="submit"
                      loading={saving}
                      type="primary"
                      className="h-10 rounded-lg px-5 bg-emerald-500 hover:bg-emerald-400 border-0 text-white font-bold transition-all shadow-md shadow-emerald-500/10"
                    >
                      {saving ? t("actions.saving") : creating ? t("actions.create") : t("actions.save")}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
        </Modal>
      </ConfigProvider>
    </>
  );
}
