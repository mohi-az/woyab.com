import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { FaClipboardList } from "react-icons/fa";
import { FiArrowRight, FiClock, FiMail, FiMapPin } from "react-icons/fi";
import { isAppLocale, localizePathname } from "@/i18n/config";
import { CookiePreferencesButton } from "@/components/privacy/CookiePreferencesButton";

export default async function Footer() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Footer")]);
  const appLocale = isAppLocale(locale) ? locale : "de";
  const href = (pathname: string) => localizePathname(pathname, appLocale);

  return (
    <footer className="relative overflow-hidden bg-[#111827] text-white">
      <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full border-[54px] border-white/5" />
      <div className="pointer-events-none absolute -bottom-32 left-[18%] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[1.3fr_.75fr_.9fr_1.25fr] lg:gap-12 lg:py-20">
        <div>
          <Link href={href("/")} className="inline-flex items-center gap-3 text-2xl font-black">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
              <FaClipboardList />
            </span>
            woYab
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">{t("description")}</p>
        </div>

        <div>
          <h2 className="text-lg font-extrabold">{t("linksTitle")}</h2>
          <nav className="mt-5 flex flex-col items-start gap-3 text-sm text-slate-300">
            <Link href={href("/")} className="transition hover:text-white">{t("home")}</Link>
            <Link href={href("/businesses")} className="transition hover:text-white">{t("businesses")}</Link>
          </nav>
        </div>

        <div>
          <h2 className="text-lg font-extrabold">{t("contactTitle")}</h2>
          <div className="mt-5 space-y-4 text-sm text-slate-300">
            <p className="flex items-start gap-3"><FiMapPin className="mt-1 shrink-0 text-primary" />{t("contactPending")}</p>
            <p className="flex items-center gap-3"><FiMail className="shrink-0 text-primary" />{t("emailPending")}</p>
            <p className="flex items-center gap-3"><FiClock className="shrink-0 text-primary" />{t("soon")}</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-extrabold">{t("newsletterTitle")}</h2>
          <p className="mt-5 text-sm leading-7 text-slate-300">{t("newsletterDescription")}</p>
          <div className="mt-5 flex rounded-xl bg-white p-1.5 shadow-lg" aria-disabled="true">
            <input
              type="email"
              disabled
              placeholder={t("emailPlaceholder")}
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-600 outline-none disabled:cursor-not-allowed"
            />
            <span className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-white">
              {t("comingSoon")} <FiArrowRight className="rtl:rotate-180" />
            </span>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-center text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-start">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-end">
            <Link href={href("/legal/terms")} className="transition hover:text-white">{t("legal")}</Link>
            <Link href={href("/privacy")} className="transition hover:text-white">{t("privacy")}</Link>
            <CookiePreferencesButton label={t("cookieSettings")} />
            <p>{t("madeFor")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
