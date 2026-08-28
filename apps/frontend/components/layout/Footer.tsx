import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { FiMail, FiMessageSquare } from "react-icons/fi";
import { FaAndroid, FaApple } from "react-icons/fa";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { isAppLocale, localizePathname } from "@/i18n/config";
import { CookiePreferencesButton } from "@/components/privacy/CookiePreferencesButton";
import { supportEmail } from "@/lib/mail";

export default async function Footer() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Footer")]);
  const appLocale = isAppLocale(locale) ? locale : "de";
  const href = (pathname: string) => localizePathname(pathname, appLocale);
  const support = supportEmail();

  return (
    <footer className="relative overflow-hidden bg-[#111827] text-white">
      <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full border-[54px] border-white/5" />
      <div className="pointer-events-none absolute -bottom-32 left-[18%] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-x-12 gap-y-10 px-5 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.45fr_.8fr_1fr_1fr] lg:py-16">
        <div>
          <Link href={href("/")} className="inline-flex" aria-label="WoYab">
            <BrandLogo variant="white" className="h-11 max-w-[8.5rem]" />
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">{t("description")}</p>
          <div className="mt-5 flex max-w-sm items-center gap-3.5">
            <span className="flex shrink-0 items-center gap-2 text-3xl" dir="ltr" aria-hidden="true">
              <FaApple className="text-[#f5f5f7]" />
              <FaAndroid className="text-[#3ddc84]" />
            </span>
            <p className="text-sm leading-6 text-slate-300">{t("mobilePwa")}</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-extrabold">{t("linksTitle")}</h2>
          <nav className="mt-5 flex flex-col items-start gap-3.5 text-sm text-slate-300">
            <Link href={href("/")} className="transition hover:text-white">{t("home")}</Link>
            <Link href={href("/businesses")} className="transition hover:text-white">{t("businesses")}</Link>
            <Link href={href("/for-businesses")} className="transition hover:text-white">{t("businessOwners")}</Link>
          </nav>
        </div>

        <div>
          <h2 className="text-lg font-extrabold">{t("supportTitle")}</h2>
          <nav className="mt-5 flex flex-col items-start gap-3.5 text-sm text-slate-300">
            <Link href={href("/contact")} className="inline-flex items-center gap-3 transition hover:text-white">
              <FiMessageSquare className="shrink-0 text-primary" />
              {t("contactForm")}
            </Link>
            <a href={`mailto:${support}`} className="inline-flex min-w-0 items-center gap-3 transition hover:text-white">
              <FiMail className="shrink-0 text-primary" />
              <span className="break-all" dir="ltr">{support}</span>
            </a>
          </nav>
        </div>

        <div>
          <h2 className="text-lg font-extrabold">{t("legalTitle")}</h2>
          <nav className="mt-5 flex flex-col items-start gap-3.5 text-sm text-slate-300">
            <Link href={href("/legal/terms")} className="transition hover:text-white">{t("legal")}</Link>
            <Link href={href("/privacy")} className="transition hover:text-white">{t("privacy")}</Link>
            <CookiePreferencesButton label={t("cookieSettings")} />
          </nav>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-center text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-start">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <p>{t("madeFor")}</p>
        </div>
      </div>
    </footer>
  );
}
