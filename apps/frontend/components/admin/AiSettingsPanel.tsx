"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiCpu,
  FiEye,
  FiEyeOff,
  FiKey,
  FiPlay,
  FiRefreshCw,
  FiSave,
} from "react-icons/fi";
import { AdminButton, AdminSection } from "@/components/admin/AdminPrimitives";
import type { AiGenerationResult, AiModel, AiProvider, PublicAiProviderConfig } from "@/lib/ai/types";
import { aiProviders } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

type Draft = Omit<PublicAiProviderConfig, "updatedAt"> & {
  apiKey: string;
  clearApiKey: boolean;
};

type Notice = { tone: "success" | "error"; message: string } | null;

const inputClassName = "admin-input min-h-11 w-full rounded-lg px-3 text-sm outline-none focus:border-sky-400";

function draftsFromConfigs(configs: PublicAiProviderConfig[]): Record<AiProvider, Draft> {
  const byProvider = new Map(configs.map((config) => [config.provider, config]));
  const toDraft = (provider: AiProvider): Draft => {
    const config = byProvider.get(provider);
    if (!config) throw new Error(`Missing ${provider} configuration.`);
    return { ...config, apiKey: "", clearApiKey: false };
  };
  return { OPENAI: toDraft("OPENAI"), GEMINI: toDraft("GEMINI") };
}

export function AiSettingsPanel({ initialConfigs, encryptionReady }: {
  initialConfigs: PublicAiProviderConfig[];
  encryptionReady: boolean;
}) {
  const t = useTranslations("Admin.ai");
  const locale = useLocale();
  const [configs, setConfigs] = useState(initialConfigs);
  const [drafts, setDrafts] = useState(() => draftsFromConfigs(initialConfigs));
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>(() =>
    initialConfigs.find((config) => config.isDefault)?.provider ?? "OPENAI");
  const [models, setModels] = useState<Record<AiProvider, AiModel[]>>({ OPENAI: [], GEMINI: [] });
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [testPrompt, setTestPrompt] = useState(t("test.defaultPrompt"));
  const [testResult, setTestResult] = useState<AiGenerationResult | null>(null);

  const draft = drafts[selectedProvider];
  const storedConfig = configs.find((config) => config.provider === selectedProvider)!;
  const providerModels = models[selectedProvider];
  const canUseKey = Boolean(draft.apiKey.trim() || (draft.hasApiKey && !draft.clearApiKey));

  const updatedLabel = useMemo(() => storedConfig.updatedAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(storedConfig.updatedAt))
    : t("status.neverSaved"), [locale, storedConfig.updatedAt, t]);

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDrafts((current) => ({
      ...current,
      [selectedProvider]: { ...current[selectedProvider], [key]: value },
    }));
    setNotice(null);
  }

  async function apiRequest<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
      method: url.endsWith("/config") ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({})) as T & { error?: string };
    if (!response.ok) throw new Error(payload.error || t("errors.requestFailed"));
    return payload;
  }

  async function loadModels() {
    setLoadingModels(true);
    setNotice(null);
    try {
      const payload = await apiRequest<{ models: AiModel[] }>("/api/admin/ai/models", {
        provider: selectedProvider,
        apiKey: draft.apiKey.trim() || undefined,
        timeoutMs: draft.timeoutMs,
      });
      setModels((current) => ({ ...current, [selectedProvider]: payload.models }));
      setNotice({ tone: "success", message: t("messages.modelsLoaded", { count: payload.models.length }) });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : t("errors.requestFailed") });
    } finally {
      setLoadingModels(false);
    }
  }

  async function saveConfiguration() {
    setSaving(true);
    setNotice(null);
    try {
      const payload = await apiRequest<{ configs: PublicAiProviderConfig[] }>("/api/admin/ai/config", {
        provider: selectedProvider,
        enabled: draft.enabled,
        isDefault: draft.isDefault,
        apiKey: draft.apiKey.trim() || undefined,
        clearApiKey: draft.clearApiKey,
        model: draft.model?.trim() || null,
        systemPrompt: draft.systemPrompt?.trim() || null,
        temperature: draft.temperature,
        maxOutputTokens: draft.maxOutputTokens,
        timeoutMs: draft.timeoutMs,
      });
      setConfigs(payload.configs);
      setDrafts(draftsFromConfigs(payload.configs));
      setNotice({ tone: "success", message: t("messages.saved") });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : t("errors.requestFailed") });
    } finally {
      setSaving(false);
    }
  }

  async function runTest() {
    setTesting(true);
    setNotice(null);
    setTestResult(null);
    try {
      const payload = await apiRequest<{ result: AiGenerationResult }>("/api/admin/ai/test", {
        provider: selectedProvider,
        apiKey: draft.apiKey.trim() || undefined,
        model: draft.model?.trim(),
        prompt: testPrompt.trim(),
        systemPrompt: draft.systemPrompt?.trim() || null,
        temperature: draft.temperature,
        maxOutputTokens: draft.maxOutputTokens,
        timeoutMs: draft.timeoutMs,
      });
      setTestResult(payload.result);
      setNotice({ tone: "success", message: t("messages.testSucceeded") });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : t("errors.requestFailed") });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      {!encryptionReady ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-400/35 bg-amber-400/10 p-4 text-sm text-amber-200">
          <FiAlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div><strong className="block font-black">{t("encryption.title")}</strong><p className="mt-1 leading-6">{t("encryption.description")}</p></div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {aiProviders.map((provider) => {
          const config = configs.find((item) => item.provider === provider)!;
          return (
            <button
              key={provider}
              type="button"
              onClick={() => { setSelectedProvider(provider); setNotice(null); setTestResult(null); setShowApiKey(false); }}
              className={cn(
                "admin-field-panel flex items-center justify-between rounded-lg border p-4 text-start transition",
                selectedProvider === provider && "border-sky-400 ring-2 ring-sky-400/20",
              )}
            >
              <span className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-sky-500/15 text-sky-400"><FiCpu className="h-5 w-5" /></span>
                <span><strong className="admin-title block">{t(`providers.${provider}.name`)}</strong><small className="admin-muted mt-1 block">{config.model || t("status.noModel")}</small></span>
              </span>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-black", config.enabled ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400")}>
                {config.isDefault ? t("status.default") : config.enabled ? t("status.enabled") : t("status.disabled")}
              </span>
            </button>
          );
        })}
      </div>

      {notice ? (
        <div className={cn("flex items-start gap-3 rounded-lg border p-4 text-sm", notice.tone === "success" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border-rose-400/30 bg-rose-500/10 text-rose-300")}>
          {notice.tone === "success" ? <FiCheckCircle className="mt-0.5 h-5 w-5 shrink-0" /> : <FiAlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />}
          <span>{notice.message}</span>
        </div>
      ) : null}

      <AdminSection title={t("credentials.title")} description={t("credentials.description", { provider: t(`providers.${selectedProvider}.name`) })}>
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-black admin-title">
            <span className="flex items-center gap-2"><FiKey />{t("fields.apiKey")}</span>
            <span className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={draft.apiKey}
                onChange={(event) => updateDraft("apiKey", event.target.value)}
                placeholder={draft.hasApiKey ? t("fields.savedKey", { hint: draft.apiKeyHint || "••••" }) : t("fields.apiKeyPlaceholder")}
                autoComplete="new-password"
                className={cn(inputClassName, "pe-12")}
              />
              <button type="button" onClick={() => setShowApiKey((current) => !current)} className="admin-icon-button absolute inset-y-1 end-1 grid w-10 place-items-center rounded-md" aria-label={showApiKey ? t("actions.hideKey") : t("actions.showKey")}>
                {showApiKey ? <FiEyeOff /> : <FiEye />}
              </button>
            </span>
            <small className="admin-muted font-normal">{t("fields.apiKeyHint")}</small>
          </label>

          <label className="grid gap-2 text-sm font-black admin-title">
            {t("fields.model")}
            <div className="flex gap-2">
              <input list={`${selectedProvider}-models`} value={draft.model || ""} onChange={(event) => updateDraft("model", event.target.value)} placeholder={t("fields.modelPlaceholder")} className={inputClassName} />
              <datalist id={`${selectedProvider}-models`}>{providerModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</datalist>
              <AdminButton type="button" onClick={loadModels} disabled={loadingModels || !canUseKey} className="shrink-0">
                <FiRefreshCw className={cn(loadingModels && "animate-spin")} />{loadingModels ? t("actions.loadingModels") : t("actions.loadModels")}
              </AdminButton>
            </div>
            <small className="admin-muted font-normal">{t("fields.modelHint")}</small>
          </label>
        </div>

        {draft.hasApiKey ? (
          <label className="admin-muted mt-4 inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.clearApiKey} onChange={(event) => updateDraft("clearApiKey", event.target.checked)} className="h-4 w-4 accent-rose-500" />
            {t("fields.clearApiKey")}
          </label>
        ) : null}
      </AdminSection>

      <AdminSection title={t("behavior.title")} description={t("behavior.description")}>
        <div className="grid gap-5 lg:grid-cols-3">
          <label className="grid gap-2 text-sm font-black admin-title lg:col-span-3">
            {t("fields.systemPrompt")}
            <textarea value={draft.systemPrompt || ""} onChange={(event) => updateDraft("systemPrompt", event.target.value)} rows={5} maxLength={12_000} placeholder={t("fields.systemPromptPlaceholder")} className={cn(inputClassName, "resize-y py-3 leading-6")} />
            <small className="admin-muted text-end font-normal">{(draft.systemPrompt || "").length.toLocaleString(locale)} / 12,000</small>
          </label>
          <label className="grid gap-2 text-sm font-black admin-title">
            {t("fields.temperature")}
            <input type="number" min="0" max="2" step="0.1" value={draft.temperature ?? ""} onChange={(event) => updateDraft("temperature", event.target.value === "" ? null : Number(event.target.value))} placeholder={t("fields.providerDefault")} className={inputClassName} />
            <small className="admin-muted font-normal">{t("fields.temperatureHint")}</small>
          </label>
          <label className="grid gap-2 text-sm font-black admin-title">
            {t("fields.maxOutputTokens")}
            <input type="number" min="1" max="131072" value={draft.maxOutputTokens} onChange={(event) => updateDraft("maxOutputTokens", Number(event.target.value))} className={inputClassName} />
            <small className="admin-muted font-normal">{t("fields.maxOutputTokensHint")}</small>
          </label>
          <label className="grid gap-2 text-sm font-black admin-title">
            {t("fields.timeoutMs")}
            <input type="number" min="1000" max="120000" step="1000" value={draft.timeoutMs} onChange={(event) => updateDraft("timeoutMs", Number(event.target.value))} className={inputClassName} />
            <small className="admin-muted font-normal">{t("fields.timeoutHint")}</small>
          </label>
        </div>

        <div className="admin-field-panel mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
          <div className="flex flex-wrap gap-5">
            <label className="admin-title inline-flex items-center gap-2 text-sm font-black"><input type="checkbox" checked={draft.enabled} onChange={(event) => updateDraft("enabled", event.target.checked)} className="h-4 w-4 accent-sky-500" />{t("fields.enabled")}</label>
            <label className="admin-title inline-flex items-center gap-2 text-sm font-black"><input type="checkbox" checked={draft.isDefault} onChange={(event) => updateDraft("isDefault", event.target.checked)} className="h-4 w-4 accent-emerald-500" />{t("fields.defaultProvider")}</label>
          </div>
          <span className="admin-muted text-xs">{t("status.updated", { date: updatedLabel })}</span>
        </div>

        <div className="mt-5 flex justify-end">
          <AdminButton type="button" tone="success" onClick={saveConfiguration} disabled={saving || (Boolean(draft.apiKey.trim()) && !encryptionReady)}>
            <FiSave />{saving ? t("actions.saving") : t("actions.save")}
          </AdminButton>
        </div>
      </AdminSection>

      <AdminSection title={t("test.title")} description={t("test.description")}>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-black admin-title">
            {t("fields.testPrompt")}
            <textarea value={testPrompt} onChange={(event) => setTestPrompt(event.target.value)} rows={3} maxLength={2_000} className={cn(inputClassName, "resize-y py-3")} />
          </label>
          <div><AdminButton type="button" onClick={runTest} disabled={testing || !canUseKey || !draft.model || !testPrompt.trim()}><FiPlay />{testing ? t("actions.testing") : t("actions.test")}</AdminButton></div>
          {testResult ? (
            <div className="admin-field-panel rounded-lg border p-4">
              <div className="flex flex-wrap justify-between gap-3 text-xs admin-muted"><span>{testResult.provider} · {testResult.model}</span><span>{t("test.tokens", { count: testResult.totalTokens ?? 0 })}</span></div>
              <pre className="admin-title mt-4 whitespace-pre-wrap font-sans text-sm leading-7">{testResult.text}</pre>
            </div>
          ) : null}
        </div>
      </AdminSection>
    </div>
  );
}
