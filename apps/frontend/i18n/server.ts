import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { defaultLocale, isAppLocale, localeHeaderName, localizePathname } from "@/i18n/config";

export async function getRequestLocale() {
  const headerStore = await headers();
  const locale = headerStore.get(localeHeaderName);
  return isAppLocale(locale) ? locale : defaultLocale;
}

export async function redirectWithLocale(pathname: string) {
  const locale = await getRequestLocale();
  redirect(localizePathname(pathname, locale));
}
