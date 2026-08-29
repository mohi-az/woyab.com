"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Collapse, ConfigProvider, Modal } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { FiAlertCircle, FiCheck, FiClock, FiCpu, FiEdit3, FiEye, FiGlobe, FiImage, FiInfo, FiLoader, FiMapPin, FiPlus, FiTag } from "react-icons/fi";
import { MdOutlineVerified, MdStar, MdStarBorder, MdVerified } from "react-icons/md";
import { Link } from "@/i18n/navigation";
import { setBusinessFlag, setBusinessStatus, updateBusinessDetails } from "@/lib/admin-actions";
import { AdminButton, AdminSection, AdminTable, StatusBadge, tableClassName, tdClassName, thClassName } from "@/components/admin/AdminPrimitives";
import { AdminSearchSelect } from "@/components/admin/AdminSearchSelect";
import { GooglePlaceImport, type GooglePlaceImportData } from "@/components/admin/GooglePlaceImport";
import { AiBusinessImportModal, type AiBusinessImportApplication, type AiImportSelection } from "@/components/admin/AiBusinessImportModal";
import { BusinessAttributeFields } from "@/components/business/BusinessAttributeFields";
import { BusinessTagFields } from "@/components/business/BusinessTagFields";
import { BusinessHoursEditor, type BusinessHourValue } from "@/components/dashboard/BusinessHoursEditor";
import { BusinessImageManager, type GooglePlacePhoto } from "@/components/dashboard/BusinessImageManager";
import { BusinessLocationPicker } from "@/components/location/BusinessLocationPicker";
import type { BusinessAttributeDefinition, BusinessAttributeValue } from "@/lib/business-attributes";
import type { BusinessTagOption, BusinessTagValue } from "@/lib/business-tags";

const statuses = ["PENDING", "ACTIVE", "SUSPENDED", "CLOSED", "REJECTED"] as const;
const locales = ["DE", "EN", "FA"] as const;
const inputClassName = "admin-input h-10 rounded-lg px-3 text-sm outline-none focus:border-sky-400";
const textAreaClassName = "admin-input min-h-24 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400";
type QuickAttributeType = "BOOLEAN" | "TEXT" | "NUMBER";

type Option = {
  id: number;
  nameEn: string | null;
  nameDe?: string | null;
  nameFa: string | null;
  slug?: string;
};

type SubCategoryOption = Option & { categoryId: number };
type DistrictOption = Option & { cityId: number };
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
  cityId: number;
  districtId: number | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  postalCode: string | null;
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
  establishedYear: number | null;
  priceRange: "BUDGET" | "MODERATE" | "EXPENSIVE" | "LUXURY" | null;
  googleRating: number | null;
  googleUserRatingCount: number | null;
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
  googlePlaceId: string | null;
  googleCoverPhotoReference: string | null;
  coverImageUrl: string | null;
  images: Array<{ imageUrl: string }>;
};

type Props = {
  businesses: AdminBusinessRow[];
  total: number;
  page: number;
  totalPages: number;
  categories: Option[];
  subCategories: SubCategoryOption[];
  cities: Option[];
  districts: DistrictOption[];
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

function optionLabel(option: Option) {
  return [option.nameDe, option.nameEn, option.nameFa].filter(Boolean).join(" / ");
}

const googlePlaceTaxonomy: Record<string, { categorySlug: string; subCategorySlug?: string }> = {
  persian_restaurant: { categorySlug: "restaurants-cafes", subCategorySlug: "persian-restaurant" },
  cafe: { categorySlug: "restaurants-cafes", subCategorySlug: "cafe" },
  coffee_shop: { categorySlug: "restaurants-cafes", subCategorySlug: "cafe" },
  bakery: { categorySlug: "restaurants-cafes", subCategorySlug: "bakery" },
  hair_salon: { categorySlug: "beauty-wellness", subCategorySlug: "hair-salon" },
  beauty_salon: { categorySlug: "beauty-wellness", subCategorySlug: "hair-salon" },
  spa: { categorySlug: "beauty-wellness", subCategorySlug: "spa-massage" },
  massage: { categorySlug: "beauty-wellness", subCategorySlug: "spa-massage" },
  lawyer: { categorySlug: "legal-financial", subCategorySlug: "law-office" },
  accountant: { categorySlug: "legal-financial", subCategorySlug: "accounting" },
  insurance_agency: { categorySlug: "legal-financial", subCategorySlug: "insurance" },
  plumber: { categorySlug: "home-services", subCategorySlug: "plumbing" },
  electrician: { categorySlug: "home-services", subCategorySlug: "electrical" },
  house_cleaning_service: { categorySlug: "home-services", subCategorySlug: "cleaning" },
  car_repair: { categorySlug: "automotive", subCategorySlug: "repair-shop" },
  car_wash: { categorySlug: "automotive", subCategorySlug: "car-wash" },
  car_dealer: { categorySlug: "automotive", subCategorySlug: "car-dealer" },
  grocery_store: { categorySlug: "retail" },
  clothing_store: { categorySlug: "retail", subCategorySlug: "clothing" },
};

function googlePlaceTaxonomyMatch(primaryType: string | null, primaryTypeLabel: string | null) {
  if (primaryType) {
    const exactMatch = googlePlaceTaxonomy[primaryType]
      ?? (primaryType.endsWith("_restaurant") ? { categorySlug: "restaurants-cafes" } : null);
    if (exactMatch) return exactMatch;
  }

  const label = primaryTypeLabel?.trim().toLocaleLowerCase();
  if (!label) return null;
  if (/(persisch|persian).*restaurant/.test(label)) return googlePlaceTaxonomy.persian_restaurant;
  if (/(restaurant|café|cafe)/.test(label)) return { categorySlug: "restaurants-cafes" };
  if (/(bäckerei|bakery)/.test(label)) return googlePlaceTaxonomy.bakery;
  if (/(friseur|hair salon|beauty salon)/.test(label)) return googlePlaceTaxonomy.hair_salon;
  if (/(spa|massage)/.test(label)) return googlePlaceTaxonomy.spa;
  if (/(rechtsanwalt|lawyer|law office)/.test(label)) return googlePlaceTaxonomy.lawyer;
  if (/(buchhalt|accountant)/.test(label)) return googlePlaceTaxonomy.accountant;
  if (/(versicherung|insurance)/.test(label)) return googlePlaceTaxonomy.insurance_agency;
  if (/(klempner|plumb)/.test(label)) return googlePlaceTaxonomy.plumber;
  if (/(elektriker|electrician)/.test(label)) return googlePlaceTaxonomy.electrician;
  if (/(reinigung|cleaning)/.test(label)) return googlePlaceTaxonomy.house_cleaning_service;
  if (/(autowerkstatt|car repair)/.test(label)) return googlePlaceTaxonomy.car_repair;
  if (/(autowäsche|car wash)/.test(label)) return googlePlaceTaxonomy.car_wash;
  if (/(autohändler|car dealer)/.test(label)) return googlePlaceTaxonomy.car_dealer;
  if (/(supermarkt|grocery)/.test(label)) return googlePlaceTaxonomy.grocery_store;
  if (/(bekleidung|clothing)/.test(label)) return googlePlaceTaxonomy.clothing_store;
  return null;
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

function translationDrafts(business: AdminBusinessRow | null) {
  const map = translationMap(business);
  return Object.fromEntries(locales.map((locale) => {
    const translation = map.get(locale);
    return [locale, {
      locale,
      businessName: translation?.businessName ?? "",
      shortDescription: translation?.shortDescription ?? "",
      description: translation?.description ?? "",
    }];
  })) as Record<(typeof locales)[number], Translation>;
}

function emptyBusiness(): AdminBusinessRow | null {
  return null;
}

function stepForField(field: string) {
  if (["slug", "sourceLocale", "status", "categoryId", "cityId"].includes(field)) return 0;
  if (field.startsWith("businessName_")) return 1;
  if (field.startsWith("attribute_") || field === "tagIds") return 2;
  if (field === "coverImageUrl" || field === "imageUrl") return 3;
  if (field.startsWith("hours_")) return 5;
  return 0;
}

function isStoredGoogleCover(imageUrl: string | null | undefined) {
  return Boolean(imageUrl && (
    imageUrl.startsWith("/media/businesses/google-place-")
    || imageUrl.startsWith("/uploads/businesses/google-place-")
  ));
}

function requiredLabel(label: string) {
  return <span>{label} <span className="text-rose-400">*</span></span>;
}

function actionToggleClassName(active: boolean, tone: "verified" | "featured") {
  if (!active) {
    return "grid h-9 w-9 place-items-center rounded-lg border border-[var(--admin-border)] bg-transparent text-[var(--admin-muted)] transition hover:border-sky-300/60 hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-70";
  }

  if (tone === "verified") {
    return "grid h-9 w-9 place-items-center rounded-lg border border-emerald-300 bg-emerald-400 text-slate-950 shadow-[0_0_0_3px_rgba(52,211,153,.18)] transition hover:-translate-y-0.5 hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-70";
  }

  return "grid h-9 w-9 place-items-center rounded-lg border border-amber-200 bg-amber-300 text-slate-950 shadow-[0_0_0_3px_rgba(251,191,36,.22)] transition hover:-translate-y-0.5 hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:cursor-not-allowed disabled:opacity-70";
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
  cities,
  districts,
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
  const router = useRouter();
  const locale = useLocale();
  const defaultSourceLocale = locale === "fa" ? "FA" : locale === "en" ? "EN" : "DE";
  const [editing, setEditing] = useState<AdminBusinessRow | null>(emptyBusiness());
  const [creating, setCreating] = useState(initialCreateOpen);
  const [aiImportOpen, setAiImportOpen] = useState(false);
  const [aiApplication, setAiApplication] = useState<AiBusinessImportApplication | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [locationPickerMounted, setLocationPickerMounted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [operationError, setOperationError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sourceLocaleDraft, setSourceLocaleDraft] = useState<"DE" | "EN" | "FA">(defaultSourceLocale);
  const [translationValues, setTranslationValues] = useState(() => translationDrafts(null));
  const [categoryIdDraft, setCategoryIdDraft] = useState(String(categories[0]?.id ?? ""));
  const [subCategoryIdDraft, setSubCategoryIdDraft] = useState("");
  const [cityIdDraft, setCityIdDraft] = useState(String(cities[0]?.id ?? ""));
  const [districtIdDraft, setDistrictIdDraft] = useState("");
  const [locationDraft, setLocationDraft] = useState<{ address: string; latitude: number | null; longitude: number | null }>({ address: "", latitude: null, longitude: null });
  const [hoursDraft, setHoursDraft] = useState<BusinessHourValue[]>([]);
  const [googlePhotoReferenceDraft, setGooglePhotoReferenceDraft] = useState("");
  const [googlePlaceIdDraft, setGooglePlaceIdDraft] = useState("");
  const [googlePhotos, setGooglePhotos] = useState<GooglePlacePhoto[]>([]);
  const [googlePhotosStatus, setGooglePhotosStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [imageMode, setImageMode] = useState<"google" | "manual">("google");
  const [attributeDefinitionDrafts, setAttributeDefinitionDrafts] = useState(attributeDefinitions);
  const [quickAttributeOpen, setQuickAttributeOpen] = useState(false);
  const [quickAttributeLabels, setQuickAttributeLabels] = useState({ labelFa: "", labelEn: "", labelDe: "" });
  const [quickAttributeType, setQuickAttributeType] = useState<QuickAttributeType>("BOOLEAN");
  const [quickAttributeSaving, setQuickAttributeSaving] = useState(false);
  const [quickAttributeError, setQuickAttributeError] = useState("");
  const [quickSelectedAttributeIds, setQuickSelectedAttributeIds] = useState<number[]>([]);
  const [formResetVersion, setFormResetVersion] = useState(0);
  const [importVersion, setImportVersion] = useState(0);
  const [rowUiStates, setRowUiStates] = useState<Record<string, RowUiState>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const modalOpen = creating || Boolean(editing);
  const defaultCategoryId = categories[0]?.id ?? "";
  const defaultCityId = cities[0]?.id ?? "";
  const visibleSubCategories = subCategories.filter((item) => String(item.categoryId) === categoryIdDraft);
  const visibleDistricts = districts.filter((item) => String(item.cityId) === cityIdDraft);
  const aiSelected = (group: AiImportSelection) => Boolean(aiApplication?.selected.includes(group));
  const aiProposal = aiApplication?.proposal ?? null;
  const aiGoogleRating = typeof aiApplication?.googleSnapshot.rating === "number" ? aiApplication.googleSnapshot.rating : null;
  const aiGoogleRatingCount = typeof aiApplication?.googleSnapshot.userRatingCount === "number" ? aiApplication.googleSnapshot.userRatingCount : null;
  const categorySelectOptions = [
    ...categories.map((item) => ({ value: String(item.id), label: optionLabel(item) })),
    ...(aiSelected("category") && aiProposal?.taxonomy.category.suggested
      ? [{ value: "ai:category", label: `AI · ${aiProposal.taxonomy.category.suggested.nameDe} / ${aiProposal.taxonomy.category.suggested.nameEn} / ${aiProposal.taxonomy.category.suggested.nameFa} (${t("aiImport.newItem")})` }]
      : []),
  ];
  const subCategorySelectOptions = [
    ...visibleSubCategories.map((item) => ({ value: String(item.id), label: optionLabel(item) })),
    ...(aiSelected("subCategory") && aiProposal?.taxonomy.subCategory?.suggested
      ? [{ value: "ai:subcategory", label: `AI · ${aiProposal.taxonomy.subCategory.suggested.nameDe} / ${aiProposal.taxonomy.subCategory.suggested.nameEn} / ${aiProposal.taxonomy.subCategory.suggested.nameFa} (${t("aiImport.newItem")})` }]
      : []),
  ];
  const wizardSteps = [
    t("businessWizard.identity"),
    t("businessWizard.translations"),
    `${t("businessWizard.features")} / ${t("businessWizard.tags")}`,
    t("businessWizard.media"),
    t("businessWizard.location"),
    t("businessWizard.hours"),
  ];
  const cardBasicInfo = t("businessWizard.cards.basicInfo");
  const cardTaxonomy = t("businessWizard.cards.taxonomy");
  const cardContactInfo = t("businessWizard.cards.contactInfo");
  const cardTranslations = t("businessWizard.cards.translations");
  const baseAttributeValues = editing?.attributes ?? (aiSelected("attributes") ? aiProposal?.attributes ?? [] : []);
  const formAttributeValues = [
    ...baseAttributeValues,
    ...quickSelectedAttributeIds
      .filter((attributeId) => !baseAttributeValues.some((item) => item.attributeId === attributeId))
      .map((attributeId) => ({ attributeId, value: "true" })),
  ];

  useEffect(() => {
    const placeId = googlePlaceIdDraft.trim();
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
  }, [googlePlaceIdDraft]);

  function resetQuickAttributeEditor() {
    setQuickAttributeOpen(false);
    setQuickAttributeLabels({ labelFa: "", labelEn: "", labelDe: "" });
    setQuickAttributeType("BOOLEAN");
    setQuickAttributeSaving(false);
    setQuickAttributeError("");
    setQuickSelectedAttributeIds([]);
  }

  async function createQuickAttribute() {
    if (!Object.values(quickAttributeLabels).some((label) => label.trim())) {
      setQuickAttributeError(t("businessWizard.quickFeature.required"));
      return;
    }
    setQuickAttributeSaving(true);
    setQuickAttributeError("");
    try {
      const response = await fetch("/api/admin/attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...quickAttributeLabels, dataType: quickAttributeType }),
      });
      const payload = await response.json().catch(() => null) as { attribute?: BusinessAttributeDefinition; error?: string } | null;
      if (!response.ok || !payload?.attribute) throw new Error(payload?.error || t("businessWizard.quickFeature.failed"));
      setAttributeDefinitionDrafts((current) => [...current, payload.attribute as BusinessAttributeDefinition]);
      if (payload.attribute.dataType === "BOOLEAN") {
        setQuickSelectedAttributeIds((current) => [...current, payload.attribute!.id]);
      }
      setQuickAttributeLabels({ labelFa: "", labelEn: "", labelDe: "" });
      setQuickAttributeType("BOOLEAN");
      setQuickAttributeOpen(false);
    } catch (error) {
      setQuickAttributeError(error instanceof Error ? error.message : t("businessWizard.quickFeature.failed"));
    } finally {
      setQuickAttributeSaving(false);
    }
  }

  function changeWizardStep(step: number) {
    setWizardStep(step);
    if (step === 4) setLocationPickerMounted(true);
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
    setSourceLocaleDraft(defaultSourceLocale);
    setTranslationValues(translationDrafts(null));
    setCategoryIdDraft(String(defaultCategoryId));
    setSubCategoryIdDraft("");
    setCityIdDraft(String(defaultCityId));
    setDistrictIdDraft("");
    setLocationDraft({ address: "", latitude: null, longitude: null });
    setHoursDraft([]);
    setGooglePhotoReferenceDraft("");
    setGooglePlaceIdDraft("");
    setGooglePhotos([]);
    setGooglePhotosStatus("idle");
    setImageMode("google");
    setImportVersion(0);
    setAiApplication(null);
    resetQuickAttributeEditor();
  }

  function openCreate() {
    setEditing(null);
    setCreating(true);
    setWizardStep(0);
    setLocationPickerMounted(false);
    setErrors({});
    setSubmitError("");
    setSaving(false);
    setSourceLocaleDraft(defaultSourceLocale);
    setTranslationValues(translationDrafts(null));
    setCategoryIdDraft(String(defaultCategoryId));
    setSubCategoryIdDraft("");
    setCityIdDraft(String(defaultCityId));
    setDistrictIdDraft("");
    setLocationDraft({ address: "", latitude: null, longitude: null });
    setHoursDraft([]);
    setGooglePhotoReferenceDraft("");
    setGooglePlaceIdDraft("");
    setGooglePhotos([]);
    setGooglePhotosStatus("idle");
    setImageMode("google");
    setImportVersion(0);
    setAiApplication(null);
    resetQuickAttributeEditor();
    setFormResetVersion((version) => version + 1);
  }

  function applyAiBusiness(application: AiBusinessImportApplication) {
    const { proposal } = application;
    setEditing(null);
    setAiApplication(application);
    setAiImportOpen(false);
    setCreating(true);
    setWizardStep(0);
    setLocationPickerMounted(false);
    setErrors({});
    setSubmitError("");
    setSaving(false);
    setSourceLocaleDraft(proposal.sourceLocale);
    setTranslationValues(application.selected.includes("translations") ? {
      DE: { locale: "DE", ...proposal.translations.DE },
      EN: { locale: "EN", ...proposal.translations.EN },
      FA: { locale: "FA", ...proposal.translations.FA },
    } : translationDrafts(null));
    const category = application.selected.includes("category") ? proposal.taxonomy.category : null;
    const subCategory = application.selected.includes("subCategory") ? proposal.taxonomy.subCategory : null;
    setCategoryIdDraft(category?.existingId ? String(category.existingId) : category?.suggested ? "ai:category" : "");
    setSubCategoryIdDraft(subCategory?.existingId ? String(subCategory.existingId) : subCategory?.suggested ? "ai:subcategory" : "");
    setCityIdDraft(application.selected.includes("location") && proposal.location.cityId ? String(proposal.location.cityId) : "");
    setDistrictIdDraft(application.selected.includes("location") && proposal.location.districtId ? String(proposal.location.districtId) : "");
    setLocationDraft(application.selected.includes("location") ? {
      address: proposal.location.address ?? "",
      latitude: proposal.location.latitude,
      longitude: proposal.location.longitude,
    } : { address: "", latitude: null, longitude: null });
    setHoursDraft(application.selected.includes("hours") ? proposal.hours : []);
    const firstGooglePhoto = Array.isArray(application.googleSnapshot.photos) ? application.googleSnapshot.photos[0] : null;
    setGooglePhotoReferenceDraft(
      firstGooglePhoto && typeof firstGooglePhoto === "object" && typeof (firstGooglePhoto as Record<string, unknown>).photoReference === "string"
        ? String((firstGooglePhoto as Record<string, unknown>).photoReference)
        : "",
    );
    setGooglePlaceIdDraft(application.placeId);
    setImageMode("google");
    setImportVersion((version) => version + 1);
    resetQuickAttributeEditor();
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
    setTranslationValues(translationDrafts(business));
    setCategoryIdDraft(String(business.categoryId));
    setSubCategoryIdDraft(business.subCategoryId ? String(business.subCategoryId) : "");
    setCityIdDraft(String(business.cityId));
    setDistrictIdDraft(business.districtId ? String(business.districtId) : "");
    setLocationDraft({
      address: business.address ?? "",
      latitude: business.latitude,
      longitude: business.longitude,
    });
    setHoursDraft(business.businessHours);
    setGooglePhotoReferenceDraft(business.googleCoverPhotoReference ?? "");
    setGooglePlaceIdDraft(business.googlePlaceId ?? "");
    setImageMode(
      business.images.length > 0 || (business.coverImageUrl && !isStoredGoogleCover(business.coverImageUrl))
        ? "manual"
        : "google",
    );
    setImportVersion(0);
    setAiApplication(null);
    resetQuickAttributeEditor();
  }

  function setFormField(name: string, nextValue: string | number | null) {
    const field = formRef.current?.elements.namedItem(name);
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
      field.value = nextValue === null ? "" : String(nextValue);
    }
  }

  function slugSegment(value: string) {
    return value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function suggestedSlug(place: GooglePlaceImportData) {
    const parts = [place.displayName, place.city, place.primaryType ?? place.primaryTypeLabel]
      .filter((value): value is string => Boolean(value?.trim()))
      .map(slugSegment)
      .filter(Boolean);
    const slug = parts.join("-").slice(0, 100).replace(/-+$/g, "");
    return slug || `place-${place.placeId.slice(-10).toLowerCase()}`;
  }

  function googleSourceLocale(languageCode: string): "DE" | "EN" | "FA" | null {
    const language = languageCode.trim().toLowerCase().split("-", 1)[0];
    if (language === "de") return "DE";
    if (language === "en") return "EN";
    if (language === "fa") return "FA";
    return null;
  }

  function applyGooglePlace(place: GooglePlaceImportData) {
    const currentSlug = String((formRef.current?.elements.namedItem("slug") as HTMLInputElement | null)?.value ?? "").trim();
    if (creating && !currentSlug) setFormField("slug", suggestedSlug(place));
    setFormField("phone", place.phone);
    setFormField("website", place.website);
    setFormField("postalCode", place.postalCode);
    setFormField("googleRating", place.rating);
    setFormField("googleUserRatingCount", place.userRatingCount);
    setGooglePhotoReferenceDraft(place.photos[0]?.photoReference ?? "");
    setGooglePlaceIdDraft(place.placeId);

    const detectedSourceLocale = googleSourceLocale(place.displayNameLanguageCode) ?? sourceLocaleDraft;
    setSourceLocaleDraft(detectedSourceLocale);
    setTranslationValues((current) => ({
      ...current,
      [detectedSourceLocale]: {
        ...current[detectedSourceLocale],
        businessName: place.displayName,
      },
    }));
    setLocationDraft({
      address: place.formattedAddress,
      latitude: place.latitude,
      longitude: place.longitude,
    });
    if (place.catalogMatch.city) {
      setCityIdDraft(String(place.catalogMatch.city.id));
      setDistrictIdDraft(place.catalogMatch.district ? String(place.catalogMatch.district.id) : "");
      clearError("cityId");
    } else if (creating) {
      setCityIdDraft("");
      setDistrictIdDraft("");
    }
    if (place.hours.length) setHoursDraft(place.hours);
    const taxonomyMatch = googlePlaceTaxonomyMatch(place.primaryType, place.primaryTypeLabel);
    if (taxonomyMatch) {
      const category = categories.find((item) => item.slug === taxonomyMatch.categorySlug);
      const subCategory = category && taxonomyMatch.subCategorySlug
        ? subCategories.find((item) => item.categoryId === category.id && item.slug === taxonomyMatch.subCategorySlug)
        : null;
      if (category) {
        setCategoryIdDraft(String(category.id));
        setSubCategoryIdDraft(subCategory ? String(subCategory.id) : "");
        clearError("categoryId");
      }
    }
    clearError(`businessName_${detectedSourceLocale}`);
    setImportVersion((version) => version + 1);
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
    const whatsapp = String(formData.get("whatsapp") ?? "").trim();
    const website = String(formData.get("website") ?? "").trim();
    const postalCode = String(formData.get("postalCode") ?? "").trim();

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = t("validation.email");
    if (phone && !/^\+?[0-9\s().-]{6,24}$/.test(phone)) nextErrors.phone = t("validation.phone");
    if (mobile && !/^\+?[0-9\s().-]{6,24}$/.test(mobile)) nextErrors.mobile = t("validation.phone");
    if (whatsapp && !/^\+?[0-9\s().-]{6,24}$/.test(whatsapp)) nextErrors.whatsapp = t("validation.phone");
    if (website && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(website)) nextErrors.website = t("validation.website");
    for (const field of ["instagram", "telegram", "facebook", "youtube", "linkedin"] as const) {
      const url = String(formData.get(field) ?? "").trim();
      if (url && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(url)) nextErrors[field] = t("validation.website");
    }
    if (postalCode && !/^[A-Za-z0-9][A-Za-z0-9\s-]{2,12}$/.test(postalCode)) nextErrors.postalCode = t("validation.postalCode");
    const establishedYear = Number(formData.get("establishedYear"));
    if (formData.get("establishedYear") && (!Number.isInteger(establishedYear) || establishedYear < 1800 || establishedYear > new Date().getFullYear())) nextErrors.establishedYear = t("validation.required");

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
      if (creating) {
        // Use a stable HTTP endpoint for creation. Server Action identifiers are
        // build-specific and an admin may keep this long form open across a deploy.
        const response = await fetch("/api/admin/businesses", { method: "POST", body: formData });
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        if (!response.ok) throw new Error(payload?.error || t("validation.saveFailed"));
        openCreate();
        router.refresh();
      } else {
        await updateBusinessDetails(formData);
        closeModal();
      }
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
          <div className="flex flex-wrap gap-2">
            <AdminButton type="button" className="min-h-11 px-5" onClick={() => setAiImportOpen(true)}>
              <span className="inline-flex items-center gap-2"><FiCpu />{t("actions.addBusinessByAi")}</span>
            </AdminButton>
            <AdminButton type="button" className="min-h-11 px-5" onClick={openCreate}>
              <span className="inline-flex items-center gap-2"><FiPlus />{t("actions.addBusiness")}</span>
            </AdminButton>
          </div>
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
                <tr key={business.id} className="group cursor-pointer transition-colors duration-150" onClick={() => openEdit(business)}>
                  <td className={`${tdClassName} min-w-[260px]`}>
                    <div className="flex items-center gap-3">
                      <span className="admin-icon-button grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-transform group-hover:scale-105 group-hover:border-sky-400 group-hover:text-sky-300"><FiEdit3 /></span>
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
            {page > 1 ? <Link href={previousHref} className="admin-secondary-link rounded-lg border px-3 py-2 font-bold transition hover:-translate-y-0.5">{t("pagination.previous")}</Link> : <span aria-disabled="true" className="admin-secondary-link cursor-not-allowed rounded-lg border px-3 py-2 font-bold opacity-40">{t("pagination.previous")}</span>}
            {page < totalPages ? <Link href={nextHref} className="admin-secondary-link rounded-lg border px-3 py-2 font-bold transition hover:-translate-y-0.5">{t("pagination.next")}</Link> : <span aria-disabled="true" className="admin-secondary-link cursor-not-allowed rounded-lg border px-3 py-2 font-bold opacity-40">{t("pagination.next")}</span>}
          </div>
        </div>
      </AdminSection>

      {canCreate ? (
        <AiBusinessImportModal
          open={aiImportOpen}
          onClose={() => setAiImportOpen(false)}
          onApply={applyAiBusiness}
        />
      ) : null}

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
            <form key={`business-form-${editing?.id ?? "new"}-${formResetVersion}`} ref={formRef} action={submitBusinessDetails} onSubmit={handleSubmit} onChange={handleFieldChange} className="max-h-[calc(92vh-150px)] min-w-0 overflow-x-hidden overflow-y-auto pt-4">
              {editing ? <input type="hidden" name="businessId" value={editing.id} /> : null}
              {creating && aiApplication ? <input type="hidden" name="aiImportId" value={aiApplication.draftId} /> : null}
              {!locationPickerMounted ? (
                <>
                  <input type="hidden" name="latitude" value={locationDraft.latitude ?? ""} />
                  <input type="hidden" name="longitude" value={locationDraft.longitude ?? ""} />
                  <input type="hidden" name="address" value={locationDraft.address} />
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
                      FiImage,
                      FiMapPin,
                      FiClock,
                    ][index] || FiInfo;

                    return (
                      <button
                        type="button"
                        key={index}
                        onClick={() => changeWizardStep(index)}
                        className={`admin-wizard-step ${isActive ? "active" : ""} ${isCompleted && !hasError ? "completed" : ""} ${hasError ? "error" : ""}`}
                        aria-current={isActive ? "step" : undefined}
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
                      </button>
                    );
                  })}
                </div>

                {submitError ? (
                  <Alert type="error" showIcon message={submitError} className="mb-4" />
                ) : null}

                {/* Step 0: Identity */}
                <section className={wizardStep === 0 ? "grid gap-6" : "hidden"}>
                  <GooglePlaceImport
                    key={`google-place-${editing?.id ?? aiApplication?.draftId ?? "new"}`}
                    initialPlaceId={editing?.googlePlaceId ?? aiApplication?.placeId}
                    sourceLocale={sourceLocaleDraft}
                    editingBusinessId={editing?.id}
                    onApply={applyGooglePlace}
                  />
                  <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <div className="admin-wizard-card-group flex flex-col gap-4">
                      <h3 className="admin-wizard-card-title">{cardBasicInfo}</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FieldShell label={t("fields.slug")} required error={errors.slug}>
                          <input name="slug" dir="ltr" defaultValue={editing?.slug ?? aiProposal?.slug ?? ""} className={`${inputClassName} text-left`} placeholder="example-business-name" />
                        </FieldShell>
                        <FieldShell label={t("fields.legalName")}>
                          <input name="legalName" defaultValue={editing?.legalName ?? (aiSelected("legalName") ? aiProposal?.legalName ?? "" : "")} className={inputClassName} />
                        </FieldShell>
                        <FieldShell label={t("fields.sourceLocale")} required error={errors.sourceLocale}>
                          <select name="sourceLocale" value={sourceLocaleDraft} onChange={(event) => setSourceLocaleDraft(event.target.value as "DE" | "EN" | "FA")} className={inputClassName}>
                            {locales.map((item) => <option key={item} value={item}>{item}</option>)}
                          </select>
                        </FieldShell>
                        <input type="hidden" name="status" value={editing?.status ?? "PENDING"} />
                        <input type="hidden" name="verified" value={String(editing?.verified ?? false)} />
                        <input type="hidden" name="featured" value={String(editing?.featured ?? false)} />
                        <input type="hidden" name="googleRating" defaultValue={editing?.googleRating ?? aiGoogleRating ?? ""} />
                        <input type="hidden" name="googleUserRatingCount" defaultValue={editing?.googleUserRatingCount ?? aiGoogleRatingCount ?? ""} />
                        <FieldShell label={t("fields.owner")}>
                          <AdminSearchSelect
                            key={`owner-${editing?.id ?? (creating ? "new" : "none")}-${editing?.ownerId ?? "none"}`}
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
                          <AdminSearchSelect key={`category-${editing?.id ?? aiApplication?.draftId ?? (creating ? "new" : "none")}-${categoryIdDraft}`} name="categoryId" defaultValue={categoryIdDraft} options={categorySelectOptions} onValueChange={(name, value) => {
                            clearError(name);
                            setCategoryIdDraft(value);
                            setSubCategoryIdDraft("");
                          }} />
                        </FieldShell>
                        <FieldShell label={t("fields.subCategory")}>
                          <AdminSearchSelect key={`subcategory-${editing?.id ?? aiApplication?.draftId ?? (creating ? "new" : "none")}-${categoryIdDraft}-${subCategoryIdDraft}`} name="subCategoryId" defaultValue={subCategoryIdDraft} allowClear options={subCategorySelectOptions} onValueChange={(_, value) => setSubCategoryIdDraft(value)} />
                        </FieldShell>
                        <FieldShell label={t("fields.city")} required error={errors.cityId}>
                          <AdminSearchSelect key={`city-${editing?.id ?? (creating ? "new" : "none")}-${cityIdDraft}`} name="cityId" defaultValue={cityIdDraft} options={cities.map((item) => ({ value: String(item.id), label: optionLabel(item) }))} onValueChange={(name, value) => {
                            clearError(name);
                            setCityIdDraft(value);
                            setDistrictIdDraft("");
                          }} />
                        </FieldShell>
                        <FieldShell label="District / Bezirk / منطقه">
                          <AdminSearchSelect key={`district-${editing?.id ?? (creating ? "new" : "none")}-${cityIdDraft}-${districtIdDraft}`} name="districtId" defaultValue={districtIdDraft} allowClear options={visibleDistricts.map((item) => ({ value: String(item.id), label: optionLabel(item) }))} onValueChange={(_, value) => setDistrictIdDraft(value)} />
                        </FieldShell>
                      </div>
                    </div>
                  </div>

                  <div className="admin-wizard-card-group flex flex-col gap-4">
                    <h3 className="admin-wizard-card-title">{cardContactInfo}</h3>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <FieldShell label={t("fields.email")} error={errors.email}>
                        <input name="email" type="email" dir="ltr" defaultValue={editing?.email ?? (aiSelected("contact") ? aiProposal?.contact.email ?? "" : "")} className={`${inputClassName} text-left`} />
                      </FieldShell>
                      <FieldShell label={t("fields.phone")} error={errors.phone}>
                        <input name="phone" type="tel" dir="ltr" defaultValue={editing?.phone ?? (aiSelected("contact") ? aiProposal?.contact.phone ?? "" : "")} className={`${inputClassName} text-left`} />
                      </FieldShell>
                      <FieldShell label={t("fields.mobile")} error={errors.mobile}>
                        <input name="mobile" type="tel" dir="ltr" defaultValue={editing?.mobile ?? (aiSelected("contact") ? aiProposal?.contact.mobile ?? "" : "")} className={`${inputClassName} text-left`} />
                      </FieldShell>
                      <FieldShell label={t("fields.whatsapp")} error={errors.whatsapp}>
                        <input name="whatsapp" type="tel" dir="ltr" defaultValue={editing?.whatsapp ?? (aiSelected("contact") ? aiProposal?.contact.whatsapp ?? "" : "")} className={`${inputClassName} text-left`} />
                      </FieldShell>
                      <FieldShell label={t("fields.website")} error={errors.website}>
                        <input name="website" type="url" dir="ltr" defaultValue={editing?.website ?? (aiSelected("contact") ? aiProposal?.contact.website ?? "" : "")} className={`${inputClassName} text-left`} />
                      </FieldShell>
                      <FieldShell label={t("fields.postalCode")} error={errors.postalCode}>
                        <input name="postalCode" dir="ltr" defaultValue={editing?.postalCode ?? (aiSelected("location") ? aiProposal?.location.postalCode ?? "" : "")} className={`${inputClassName} text-left`} />
                      </FieldShell>
                      <FieldShell label={t("fields.establishedYear")} error={errors.establishedYear}>
                        <input name="establishedYear" type="number" min="1800" max={new Date().getFullYear()} defaultValue={editing?.establishedYear ?? (aiSelected("details") ? aiProposal?.details.establishedYear ?? "" : "")} className={inputClassName} />
                      </FieldShell>
                      <FieldShell label={t("fields.priceRange")} error={errors.priceRange}>
                        <select name="priceRange" defaultValue={editing?.priceRange ?? (aiSelected("details") ? aiProposal?.details.priceRange ?? "" : "")} className={inputClassName}>
                          <option value="">—</option>
                          {(["BUDGET", "MODERATE", "EXPENSIVE", "LUXURY"] as const).map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </FieldShell>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                      {(["instagram", "telegram", "facebook", "youtube", "linkedin"] as const).map((field) => (
                        <FieldShell key={field} label={t(`fields.${field}`)} error={errors[field]}>
                          <input name={field} type="url" dir="ltr" defaultValue={editing?.[field] ?? (aiSelected("contact") ? aiProposal?.contact[field] ?? "" : "")} className={`${inputClassName} text-left`} />
                        </FieldShell>
                      ))}
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
                        const translation = translationValues[locale];
                        return {
                          key: locale,
                          forceRender: true,
                          label: (
                            <span className={errors[`businessName_${locale}`] ? "text-rose-400 font-bold" : ""}>
                              {locale === "FA" ? "Farsi / فارسی" : locale === "DE" ? "German / آلمانی" : "English / انگلیسی"}
                            </span>
                          ),
                          children: (
                            <div className="grid gap-4">
                              <FieldShell label={t("fields.businessName")} required={locale === sourceLocaleDraft} error={errors[`businessName_${locale}`]}>
                                <input name={`businessName_${locale}`} value={translation.businessName} onChange={(event) => setTranslationValues((current) => ({ ...current, [locale]: { ...current[locale], businessName: event.target.value } }))} placeholder={t("fields.businessName")} className={inputClassName} />
                              </FieldShell>
                              <FieldShell label={t("fields.shortDescription")}>
                                <input name={`shortDescription_${locale}`} value={translation.shortDescription ?? ""} onChange={(event) => setTranslationValues((current) => ({ ...current, [locale]: { ...current[locale], shortDescription: event.target.value } }))} placeholder={t("fields.shortDescription")} className={inputClassName} />
                              </FieldShell>
                              <FieldShell label={t("fields.description")}>
                                <textarea name={`description_${locale}`} value={translation.description ?? ""} onChange={(event) => setTranslationValues((current) => ({ ...current, [locale]: { ...current[locale], description: event.target.value } }))} placeholder={t("fields.description")} rows={4} className={textAreaClassName} />
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
                    <h3 className="admin-wizard-card-title">{t("businessWizard.tags")}</h3>
                    <BusinessTagFields
                      variant="admin"
                      tags={tagOptions}
                      values={editing?.tags ?? (aiSelected("tags") ? (aiProposal?.tagIds ?? []).map((tagId) => ({ tagId })) : [])}
                    />
                  </div>
                  <div className="admin-wizard-card-group flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="admin-wizard-card-title">{t("businessWizard.features")}</h3>
                      <Button type="default" htmlType="button" onClick={() => { setQuickAttributeOpen((current) => !current); setQuickAttributeError(""); }}>
                        <span className="inline-flex items-center gap-2"><FiPlus />{t("businessWizard.quickFeature.add")}</span>
                      </Button>
                    </div>
                    {quickAttributeOpen ? (
                      <div className="grid gap-3 rounded-xl border border-sky-400/25 bg-sky-400/[0.06] p-4">
                        <p className="admin-muted text-xs">{t("businessWizard.quickFeature.hint")}</p>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          {(["labelFa", "labelEn", "labelDe"] as const).map((field) => (
                            <label key={field} className="grid gap-2">
                              <span className="admin-muted text-xs font-black">{t(`businessWizard.quickFeature.${field}`)}</span>
                              <input
                                type="text"
                                value={quickAttributeLabels[field]}
                                onChange={(event) => setQuickAttributeLabels((current) => ({ ...current, [field]: event.target.value }))}
                                className={inputClassName}
                                dir={field === "labelFa" ? "rtl" : "ltr"}
                              />
                            </label>
                          ))}
                          <label className="grid gap-2">
                            <span className="admin-muted text-xs font-black">{t("businessWizard.quickFeature.type")}</span>
                            <select value={quickAttributeType} onChange={(event) => setQuickAttributeType(event.target.value as QuickAttributeType)} className={inputClassName}>
                              <option value="BOOLEAN">Yes / No</option>
                              <option value="TEXT">Text</option>
                              <option value="NUMBER">Number</option>
                            </select>
                          </label>
                        </div>
                        {quickAttributeError ? <Alert type="error" showIcon message={quickAttributeError} /> : null}
                        <div className="flex justify-end">
                          <Button type="primary" htmlType="button" loading={quickAttributeSaving} onClick={() => void createQuickAttribute()} className="bg-emerald-500 font-bold">
                            {t("actions.create")}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    <BusinessAttributeFields
                      variant="admin"
                      definitions={attributeDefinitionDrafts}
                      values={formAttributeValues}
                    />
                  </div>
                </section>

                {/* Step 3: Media */}
                <section className={wizardStep === 3 ? "grid gap-4" : "hidden"}>
                  <div className="admin-wizard-card-group flex flex-col gap-4">
                    <h3 className="admin-wizard-card-title">{t("businessWizard.media")}</h3>
                    <BusinessImageManager
                      key={`business-images-${editing?.id ?? aiApplication?.draftId ?? "new"}-${formResetVersion}`}
                      locale={locale}
                      googlePlaceId={googlePlaceIdDraft}
                      googlePhotos={googlePhotos}
                      googlePhotosStatus={googlePhotosStatus}
                      imageMode={imageMode}
                      initialImages={editing ? [...new Set([
                        ...editing.images.map((image) => image.imageUrl),
                        ...(editing.coverImageUrl ? [editing.coverImageUrl] : []),
                      ])] : []}
                      initialCoverUrl={editing?.coverImageUrl ?? undefined}
                      initialGooglePhotoReference={googlePhotoReferenceDraft || undefined}
                      onImageModeChange={setImageMode}
                      onManualImagesChange={() => undefined}
                      onGooglePhotoReferenceChange={setGooglePhotoReferenceDraft}
                    />
                  </div>
                </section>

                {/* Step 4: Location */}
                <section className={wizardStep === 4 ? "grid gap-4" : "hidden"}>
                  <div className="admin-wizard-card-group flex flex-col gap-4">
                    <h3 className="admin-wizard-card-title">{t("location.title")}</h3>
                    {locationPickerMounted ? (
                      <BusinessLocationPicker
                        key={`location-${editing?.id ?? "new"}-${importVersion}`}
                        defaultAddress={locationDraft.address}
                        defaultLatitude={locationDraft.latitude}
                        defaultLongitude={locationDraft.longitude}
                      />
                    ) : null}
                  </div>
                </section>

                {/* Step 5: Hours */}
                <section className={wizardStep === 5 ? "grid gap-4" : "hidden"}>
                  <div className="admin-wizard-card-group flex flex-col gap-4">
                    <h3 className="admin-wizard-card-title">{tHours("title")}</h3>
                    <BusinessHoursEditor key={`hours-${editing?.id ?? "new"}-${importVersion}`} variant="admin" defaultHours={hoursDraft} />
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
