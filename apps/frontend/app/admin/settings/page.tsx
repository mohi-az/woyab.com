import { getTranslations } from "next-intl/server";
import { AdminButton, AdminSection } from "@/components/admin/AdminPrimitives";
import { updateAdminSetting } from "@/lib/admin-actions";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const defaultSettings = [
  { key: "autoApproveBusinesses", type: "boolean", fallback: false },
  { key: "autoApproveReviews", type: "boolean", fallback: false },
  { key: "adminEmail", type: "text", fallback: "" },
  { key: "moderationNote", type: "text", fallback: "" },
] as const;
const inputClassName = "admin-input h-11 min-w-0 rounded-lg px-3 text-sm outline-none focus:border-sky-400";

export default async function AdminSettingsPage() {
  await requireSuperAdmin();
  const [t, settings] = await Promise.all([
    getTranslations("Admin"),
    prisma.adminSetting.findMany(),
  ]);
  const settingMap = new Map(settings.map((setting) => [setting.key, setting.value]));

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-black text-white">{t("settings.title")}</h1><p className="mt-2 text-slate-400">{t("settings.description")}</p></div>
      <AdminSection title={t("settings.moderation")}>
        <div className="grid gap-4 lg:grid-cols-2">
          {defaultSettings.map((setting) => {
            const current = settingMap.get(setting.key) ?? setting.fallback;
            return (
              <form key={setting.key} action={updateAdminSetting} className="admin-field-panel rounded-lg border p-4">
                <input type="hidden" name="key" value={setting.key} />
                <input type="hidden" name="type" value={setting.type} />
                <label className="grid gap-2 text-sm font-black text-white">
                  {t(`settings.keys.${setting.key}`)}
                  {setting.type === "boolean" ? (
                    <select name="value" defaultValue={String(current)} className={inputClassName}>
                      <option value="true">{t("common.enabled")}</option>
                      <option value="false">{t("common.disabled")}</option>
                    </select>
                  ) : (
                    <input name="value" defaultValue={String(current)} className={inputClassName} />
                  )}
                </label>
                <div className="mt-4"><AdminButton tone="success">{t("actions.save")}</AdminButton></div>
              </form>
            );
          })}
        </div>
      </AdminSection>
    </div>
  );
}
