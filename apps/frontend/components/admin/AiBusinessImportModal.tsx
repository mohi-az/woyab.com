"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Collapse, Modal, Progress, Tag } from "antd";
import { useLocale } from "next-intl";
import { FiAlertTriangle, FiCheck, FiCpu, FiExternalLink, FiGlobe, FiImage, FiLoader, FiPlay, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import type { AiBusinessProposal, PublicAiBusinessImport, TaxonomyChoice } from "@/lib/ai/business-import-schema";

const MAX_GOOGLE_PHOTO_PREVIEWS = 4;
const selectableGroups = [
  "translations",
  "legalName",
  "contact",
  "details",
  "location",
  "hours",
  "category",
  "subCategory",
  "tags",
  "attributes",
] as const;
export type AiImportSelection = (typeof selectableGroups)[number];

export type AiBusinessImportApplication = {
  draftId: string;
  placeId: string;
  proposal: AiBusinessProposal;
  googleSnapshot: Record<string, unknown>;
  selected: AiImportSelection[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (application: AiBusinessImportApplication) => void;
};

const copy = {
  en: {
    title: "Add business by AI",
    hint: "Enter a Google Place ID. AI prepares a sourced draft; nothing is saved until you submit the business form.",
    placeId: "Google Place ID",
    start: "Start analysis",
    recent: "Recent AI drafts",
    resume: "Resume",
    retry: "Retry",
    discard: "Discard",
    preview: "AI proposal",
    apply: "Apply selected data to form",
    close: "Close",
    sources: "Evidence",
    warnings: "Warnings and conflicts",
    newItem: "New proposal",
    officialSite: "Official website pages",
    googlePhotos: "Google business photos",
    photoHint: "These photos come directly from this Google Place. The first photo will be saved as the business cover when you create it.",
    cover: "Cover",
    googleMaps: "Google Maps",
    empty: "No recent draft is available.",
    groups: {
      translations: "Three-language names and descriptions", legalName: "Legal name", contact: "Contact and social profiles",
      details: "Established year and price range", location: "Address and map location", hours: "Opening hours",
      category: "Category", subCategory: "Subcategory", tags: "Tags", attributes: "Features",
    },
  },
  de: {
    title: "Unternehmen mit KI hinzufügen",
    hint: "Google Place ID eingeben. Die KI erstellt einen belegten Entwurf; gespeichert wird erst über das Unternehmensformular.",
    placeId: "Google Place ID",
    start: "Analyse starten",
    recent: "Letzte KI-Entwürfe",
    resume: "Fortsetzen",
    retry: "Erneut versuchen",
    discard: "Verwerfen",
    preview: "KI-Vorschlag",
    apply: "Ausgewählte Daten ins Formular übernehmen",
    close: "Schließen",
    sources: "Quellen",
    warnings: "Warnungen und Konflikte",
    newItem: "Neuer Vorschlag",
    officialSite: "Seiten der offiziellen Website",
    googlePhotos: "Google-Unternehmensfotos",
    photoHint: "Diese Fotos stammen direkt von diesem Google Place. Das erste Foto wird beim Erstellen als Titelbild gespeichert.",
    cover: "Titelbild",
    googleMaps: "Google Maps",
    empty: "Keine aktuellen Entwürfe vorhanden.",
    groups: {
      translations: "Namen und Beschreibungen in drei Sprachen", legalName: "Rechtlicher Name", contact: "Kontakt und soziale Profile",
      details: "Gründungsjahr und Preisklasse", location: "Adresse und Kartenposition", hours: "Öffnungszeiten",
      category: "Kategorie", subCategory: "Unterkategorie", tags: "Tags", attributes: "Merkmale",
    },
  },
  fa: {
    title: "افزودن بیزینس با هوش مصنوعی",
    hint: "Place ID گوگل را وارد کنید. هوش مصنوعی فقط پیش‌نویس مستند می‌سازد و تا ارسال فرم هیچ داده‌ای ثبت نمی‌شود.",
    placeId: "Google Place ID",
    start: "شروع تحلیل",
    recent: "پیش‌نویس‌های اخیر",
    resume: "ادامه",
    retry: "تلاش دوباره",
    discard: "حذف پیش‌نویس",
    preview: "پیشنهاد هوش مصنوعی",
    apply: "اعمال داده‌های انتخاب‌شده در فرم",
    close: "بستن",
    sources: "شواهد و منابع",
    warnings: "هشدارها و تعارض‌ها",
    newItem: "پیشنهاد جدید",
    officialSite: "صفحات بررسی‌شده سایت رسمی",
    googlePhotos: "عکس‌های بیزینس در گوگل",
    photoHint: "این عکس‌ها مستقیماً از همین Google Place می‌آیند. هنگام ساخت بیزینس، عکس اول به‌عنوان کاور ذخیره می‌شود.",
    cover: "کاور",
    googleMaps: "Google Maps",
    empty: "پیش‌نویس اخیری وجود ندارد.",
    groups: {
      translations: "نام و توضیحات سه‌زبانه", legalName: "نام حقوقی", contact: "اطلاعات تماس و شبکه‌های اجتماعی",
      details: "سال تأسیس و بازه قیمت", location: "آدرس و موقعیت نقشه", hours: "ساعات کاری",
      category: "دسته‌بندی", subCategory: "زیردسته", tags: "تگ‌ها", attributes: "ویژگی‌ها",
    },
  },
} as const;

const runningStatuses = new Set(["QUEUED", "FETCHING_GOOGLE", "FETCHING_WEBSITE", "ANALYZING"]);
const progressByStatus: Record<string, number> = { QUEUED: 5, FETCHING_GOOGLE: 25, FETCHING_WEBSITE: 50, ANALYZING: 75, READY: 100, FAILED: 100, APPLIED: 100 };

function taxonomyLabel(choice: TaxonomyChoice | null) {
  if (!choice) return "—";
  if (choice.existingId) return `#${choice.existingId} · ${choice.reason}`;
  return `${choice.suggested?.nameDe ?? "—"} / ${choice.suggested?.nameEn ?? "—"} / ${choice.suggested?.nameFa ?? "—"}`;
}

function defaultSelections(proposal: AiBusinessProposal) {
  const selected = new Set<AiImportSelection>();
  for (const group of selectableGroups) {
    const related = proposal.evidence.filter((item) => item.field === group || item.field.startsWith(`${group}.`));
    if (!related.some((item) => item.confidence === "LOW")) selected.add(group);
  }
  if (proposal.taxonomy.category.suggested) selected.delete("category");
  if (proposal.taxonomy.subCategory?.suggested) selected.delete("subCategory");
  return selected;
}

function valueList(proposal: AiBusinessProposal) {
  return [
    ["legalName", proposal.legalName],
    ["email", proposal.contact.email],
    ["phone", proposal.contact.phone],
    ["mobile", proposal.contact.mobile],
    ["whatsapp", proposal.contact.whatsapp],
    ["website", proposal.contact.website],
    ["instagram", proposal.contact.instagram],
    ["telegram", proposal.contact.telegram],
    ["facebook", proposal.contact.facebook],
    ["youtube", proposal.contact.youtube],
    ["linkedin", proposal.contact.linkedin],
    ["establishedYear", proposal.details.establishedYear],
    ["priceRange", proposal.details.priceRange],
    ["address", proposal.location.address],
  ].filter((entry) => entry[1] !== null && entry[1] !== "");
}

type GooglePhotoSnapshot = {
  photoReference: string;
  authorAttributions: Array<{ displayName: string; uri: string | null }>;
  googleMapsUri: string | null;
};

function photosFromGoogleSnapshot(snapshot: Record<string, unknown> | null | undefined) {
  if (!Array.isArray(snapshot?.photos)) return [];
  return snapshot.photos.flatMap((entry): GooglePhotoSnapshot[] => {
    if (!entry || typeof entry !== "object") return [];
    const photo = entry as Record<string, unknown>;
    if (typeof photo.photoReference !== "string" || !photo.photoReference.trim()) return [];
    const authorAttributions = Array.isArray(photo.authorAttributions)
      ? photo.authorAttributions.flatMap((entry): GooglePhotoSnapshot["authorAttributions"] => {
        if (!entry || typeof entry !== "object") return [];
        const author = entry as Record<string, unknown>;
        if (typeof author.displayName !== "string" || !author.displayName.trim()) return [];
        return [{
          displayName: author.displayName,
          uri: typeof author.uri === "string" && author.uri ? author.uri : null,
        }];
      })
      : [];
    return [{
      photoReference: photo.photoReference,
      authorAttributions,
      googleMapsUri: typeof photo.googleMapsUri === "string" && photo.googleMapsUri ? photo.googleMapsUri : null,
    }];
  });
}

export function AiBusinessImportModal({ open, onClose, onApply }: Props) {
  const locale = useLocale();
  const text = copy[locale === "fa" ? "fa" : locale === "de" ? "de" : "en"];
  const [placeId, setPlaceId] = useState("");
  const [drafts, setDrafts] = useState<PublicAiBusinessImport[]>([]);
  const [active, setActive] = useState<PublicAiBusinessImport | null>(null);
  const [selected, setSelected] = useState<Set<AiImportSelection>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const websitePages = useMemo(() => {
    const pages = active?.websiteEvidence?.pages;
    return Array.isArray(pages) ? pages.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
  }, [active]);
  const googlePhotos = useMemo(() => photosFromGoogleSnapshot(active?.googleSnapshot), [active]);
  const googleMapsUri = typeof active?.googleSnapshot?.googleMapsUri === "string" ? active.googleSnapshot.googleMapsUri : null;

  async function api<T>(url: string, init?: RequestInit) {
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
    const payload = await response.json().catch(() => null) as T & { error?: string };
    if (!response.ok) throw new Error(payload?.error || `Request failed with HTTP ${response.status}.`);
    return payload;
  }

  async function loadDrafts() {
    try {
      const payload = await api<{ drafts: PublicAiBusinessImport[] }>("/api/admin/ai/business-imports");
      setDrafts(payload.drafts);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load AI drafts.");
    }
  }

  function acceptDraft(draft: PublicAiBusinessImport) {
    setActive(draft);
    if (draft.proposal) setSelected(defaultSelections(draft.proposal));
  }

  async function runUntilTerminal(initial: PublicAiBusinessImport) {
    let current = initial;
    acceptDraft(current);
    for (let attempt = 0; attempt < 24 && runningStatuses.has(current.status); attempt += 1) {
      const version = `${current.status}:${current.updatedAt}`;
      const payload = await api<{ draft: PublicAiBusinessImport }>(`/api/admin/ai/business-imports/${current.id}/run`, { method: "POST" });
      current = payload.draft;
      acceptDraft(current);
      if (`${current.status}:${current.updatedAt}` === version) {
        await new Promise((resolve) => window.setTimeout(resolve, 1_000));
        const refreshed = await api<{ draft: PublicAiBusinessImport }>(`/api/admin/ai/business-imports/${current.id}`);
        current = refreshed.draft;
        acceptDraft(current);
      }
    }
    await loadDrafts();
  }

  async function resume(draft: PublicAiBusinessImport) {
    setLoading(true);
    setError("");
    try {
      await runUntilTerminal(draft);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Draft could not be resumed.");
    } finally {
      setLoading(false);
    }
  }

  async function start() {
    setLoading(true);
    setError("");
    try {
      const payload = await api<{ draft: PublicAiBusinessImport }>("/api/admin/ai/business-imports", { method: "POST", body: JSON.stringify({ placeId }) });
      let draft = payload.draft;
      if (draft.status === "FAILED") {
        const retried = await api<{ draft: PublicAiBusinessImport }>(`/api/admin/ai/business-imports/${draft.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action: "retry" }),
        });
        draft = retried.draft;
      }
      await runUntilTerminal(draft);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AI analysis could not start.");
    } finally {
      setLoading(false);
    }
  }

  async function retry(draft: PublicAiBusinessImport) {
    setLoading(true);
    setError("");
    try {
      const payload = await api<{ draft: PublicAiBusinessImport }>(`/api/admin/ai/business-imports/${draft.id}`, { method: "PATCH", body: JSON.stringify({ action: "retry" }) });
      await runUntilTerminal(payload.draft);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Retry failed.");
    } finally {
      setLoading(false);
    }
  }

  async function discard(draft: PublicAiBusinessImport) {
    setLoading(true);
    try {
      await api(`/api/admin/ai/business-imports/${draft.id}`, { method: "DELETE" });
      if (active?.id === draft.id) setActive(null);
      await loadDrafts();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Draft could not be discarded.");
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    if (!active?.proposal || !active.googleSnapshot) return;
    setLoading(true);
    setError("");
    try {
      const state = { selected: [...selected] };
      await api(`/api/admin/ai/business-imports/${active.id}`, { method: "PATCH", body: JSON.stringify({ action: "review", state }) });
      onApply({ draftId: active.id, placeId: active.placeId, proposal: active.proposal, googleSnapshot: active.googleSnapshot, selected: [...selected] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The selected data could not be applied.");
    } finally {
      setLoading(false);
    }
  }

  function toggle(group: AiImportSelection) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  }

  const proposal = active?.proposal;
  return (
    <Modal open={open} afterOpenChange={(isOpen) => { if (isOpen) void loadDrafts(); }} onCancel={onClose} footer={null} width={980} centered destroyOnClose={false} getContainer={false} title={<div><h2 className="admin-title text-2xl font-black">{text.title}</h2><p className="admin-muted mt-1 text-sm">{text.hint}</p></div>}>
      <div className="max-h-[calc(92vh-130px)] space-y-5 overflow-y-auto pt-4">
        {error ? <Alert type="error" showIcon message={error} /> : null}
        <div className="admin-wizard-card-group grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="grid gap-2 text-sm font-bold text-slate-300">
            {text.placeId}
            <input value={placeId} onChange={(event) => setPlaceId(event.target.value)} dir="ltr" className="admin-input h-11 rounded-lg px-3 text-left outline-none focus:border-sky-400" placeholder="ChIJ…" />
          </label>
          <Button type="primary" loading={loading} disabled={!placeId.trim()} onClick={start} className="self-end bg-violet-500 font-bold">
            <span className="inline-flex items-center gap-2"><FiCpu />{text.start}</span>
          </Button>
        </div>

        {active ? (
          <div className="admin-wizard-card-group space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-black text-white">{active.placeId}</div>
              <div className="flex gap-2"><Tag color="purple">{active.provider}</Tag><Tag>{active.model}</Tag><Tag color={active.status === "FAILED" ? "red" : active.status === "READY" ? "green" : "blue"}>{active.status}</Tag></div>
            </div>
            <Progress percent={progressByStatus[active.status] ?? 0} status={active.status === "FAILED" ? "exception" : active.status === "READY" ? "success" : "active"} />
            {runningStatuses.has(active.status) || loading ? <div className="flex items-center gap-2 text-sm font-bold text-sky-300"><FiLoader className="animate-spin" />{active.status}</div> : null}
            {active.errorMessage ? <Alert type="error" showIcon message={active.errorMessage} action={<Button size="small" onClick={() => retry(active)}>{text.retry}</Button>} /> : null}
          </div>
        ) : null}

        {proposal && active ? (
          <div className="space-y-4">
            <h3 className="text-xl font-black text-white">{text.preview}</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {selectableGroups.map((group) => {
                const choice = group === "category" ? proposal.taxonomy.category : group === "subCategory" ? proposal.taxonomy.subCategory : null;
                const proposedNew = Boolean(choice?.suggested);
                return (
                  <label key={group} className={`rounded-xl border p-3 ${selected.has(group) ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10 bg-black/15"}`}>
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={selected.has(group)} onChange={() => toggle(group)} className="mt-1" />
                      <span className="min-w-0"><span className="block font-black text-white">{text.groups[group]}</span>{proposedNew ? <Tag color="gold" className="mt-2">{text.newItem}</Tag> : null}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            {googlePhotos.length ? (
              <section className="admin-wizard-card-group min-w-0 max-w-full">
                <div className="mb-3">
                  <h4 className="flex items-center gap-2 font-black text-white"><FiImage />{text.googlePhotos}</h4>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{text.photoHint}</p>
                </div>
                <div className="flex max-w-full gap-3 overflow-x-auto overscroll-x-contain pb-2">
                  {googlePhotos.slice(0, MAX_GOOGLE_PHOTO_PREVIEWS).map((photo, index) => {
                    const sourceUri = photo.googleMapsUri ?? googleMapsUri;
                    return (
                      <figure key={photo.photoReference} className="relative w-56 max-w-full shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/20">
                        {index === 0 ? <Tag color="green" className="absolute start-2 top-2 z-10 font-bold">{text.cover}</Tag> : null}
                        {/* Google photo media remains behind the authenticated proxy and is never sent to the AI provider. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/place-photo?placeId=${encodeURIComponent(active.placeId)}&ref=${encodeURIComponent(photo.photoReference)}&maxWidth=600`}
                          alt=""
                          className="h-36 w-full object-cover"
                          loading="lazy"
                        />
                        <figcaption className="min-h-10 px-2 py-1.5 text-[10px] leading-4 text-slate-400">
                          {photo.authorAttributions.map((author, authorIndex) => (
                            <span key={`${author.displayName}-${authorIndex}`}>
                              {author.uri ? <a href={author.uri} target="_blank" rel="noreferrer" className="hover:text-sky-300">{author.displayName}</a> : author.displayName}
                              {authorIndex < photo.authorAttributions.length - 1 ? ", " : ""}
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

            <Collapse items={[
              { key: "translations", label: text.groups.translations, children: <div className="grid gap-3 lg:grid-cols-3">{(["DE", "EN", "FA"] as const).map((language) => <div key={language} className="rounded-lg border border-white/10 p-3"><div className="font-black text-sky-300">{language} · {proposal.translations[language].businessName}</div><p className="mt-2 text-sm text-slate-300">{proposal.translations[language].shortDescription}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">{proposal.translations[language].description}</p></div>)}</div> },
              { key: "facts", label: text.groups.contact, children: <div className="grid gap-2 md:grid-cols-2">{valueList(proposal).map(([label, value]) => <div key={String(label)} className="rounded-lg border border-white/10 px-3 py-2 text-sm"><span className="font-bold text-slate-400">{label}: </span><span className="break-all text-white">{String(value)}</span></div>)}</div> },
              { key: "taxonomy", label: `${text.groups.category} / ${text.groups.subCategory}`, children: <div className="space-y-2 text-sm text-slate-300"><div><strong>{text.groups.category}:</strong> {taxonomyLabel(proposal.taxonomy.category)}</div><div><strong>{text.groups.subCategory}:</strong> {taxonomyLabel(proposal.taxonomy.subCategory)}</div></div> },
              { key: "evidence", label: text.sources, children: <div className="space-y-2">{proposal.evidence.map((item, index) => <div key={`${item.field}-${index}`} className="rounded-lg border border-white/10 p-3 text-sm"><div className="flex flex-wrap gap-2"><Tag color={item.confidence === "HIGH" ? "green" : item.confidence === "MEDIUM" ? "gold" : "red"}>{item.confidence}</Tag><Tag>{item.source}</Tag><strong className="text-white">{item.field}</strong></div>{item.excerpt ? <p className="mt-2 text-slate-400">{item.excerpt}</p> : null}{item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sky-300"><FiExternalLink />{item.url}</a> : null}</div>)}</div> },
              { key: "website", label: text.officialSite, children: <div className="space-y-2">{websitePages.map((page, index) => <a key={index} href={String(page.url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sky-300"><FiGlobe />{String(page.title || page.url)}</a>)}</div> },
              { key: "warnings", label: text.warnings, children: <div className="space-y-2">{[...active.warnings, ...proposal.conflicts.map((item) => `${item.field}: ${item.message}`)].map((warning, index) => <div key={index} className="flex gap-2 rounded-lg border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100"><FiAlertTriangle className="mt-0.5 shrink-0" />{warning}</div>)}</div> },
            ]} />

            <div className="sticky bottom-0 flex justify-end border-t border-white/10 bg-[var(--admin-surface)] py-3">
              <Button type="primary" loading={loading} onClick={apply} className="bg-emerald-500 font-black"><span className="inline-flex items-center gap-2"><FiCheck />{text.apply}</span></Button>
            </div>
          </div>
        ) : null}

        <div className="admin-wizard-card-group space-y-3">
          <h3 className="font-black text-white">{text.recent}</h3>
          {!drafts.length ? <p className="admin-muted text-sm">{text.empty}</p> : drafts.map((draft) => (
            <div key={draft.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 p-3">
              <div><div className="font-bold text-white">{draft.placeId}</div><div className="text-xs text-slate-500">{draft.provider} · {draft.model} · {draft.status}</div></div>
              <div className="flex gap-2">
                {draft.status === "FAILED" ? <Button size="small" onClick={() => retry(draft)}><FiRefreshCw />{text.retry}</Button> : null}
                {runningStatuses.has(draft.status) ? <Button size="small" loading={loading && active?.id === draft.id} onClick={() => resume(draft)}><FiPlay />{text.resume}</Button> : null}
                {draft.status === "READY" ? <Button size="small" onClick={() => acceptDraft(draft)}><FiCheck />{text.preview}</Button> : null}
                {!['APPLIED', 'DISCARDED'].includes(draft.status) ? <Button size="small" danger onClick={() => discard(draft)}><FiTrash2 />{text.discard}</Button> : null}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end"><Button onClick={onClose}>{text.close}</Button></div>
      </div>
    </Modal>
  );
}
