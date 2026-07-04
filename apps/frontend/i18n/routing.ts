import { defineRouting } from "next-intl/routing";
import { appLocales, defaultLocale } from "@/i18n/config";

export const routing = defineRouting({
  locales: [...appLocales],
  defaultLocale,
  localePrefix: "always",
});
