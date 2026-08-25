import { getTranslations } from "next-intl/server";
import { AiSettingsPanel } from "@/components/admin/AiSettingsPanel";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { getPublicAiProviderConfigs } from "@/lib/ai/config";
import { isAiEncryptionConfigured } from "@/lib/ai/service";

export default async function AdminAiSettingsPage() {
  await requireSuperAdmin();
  const [t, configs] = await Promise.all([
    getTranslations("Admin.ai"),
    getPublicAiProviderConfigs(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black admin-title">{t("title")}</h1>
        <p className="admin-muted mt-2 max-w-3xl leading-7">{t("description")}</p>
      </div>
      <AiSettingsPanel initialConfigs={configs} encryptionReady={isAiEncryptionConfigured()} />
    </div>
  );
}
