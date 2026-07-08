/* eslint-disable @next/next/no-img-element */
import { getLocale } from "next-intl/server";
import Link from "next/link";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { NotFoundTelemetry } from "@/components/telemetry/NotFoundTelemetry";
import { isAppLocale, localizePathname } from "@/i18n/config";

const copy = {
  fa: {
    title: "404 \u067e\u06cc\u062f\u0627 \u0646\u0634\u062f",
    description: "\u0635\u0641\u062d\u0647\u200c\u0627\u06cc \u06a9\u0647 \u062f\u0646\u0628\u0627\u0644 \u0622\u0646 \u0647\u0633\u062a\u06cc\u062f \u0645\u0645\u06a9\u0646 \u0627\u0633\u062a \u062c\u0627\u0628\u0647\u200c\u062c\u0627\u060c \u062a\u063a\u06cc\u06cc\u0631 \u0646\u0627\u0645\u060c \u06cc\u0627 \u062d\u0630\u0641 \u0634\u062f\u0647 \u0628\u0627\u0634\u062f.",
    action: "\u0628\u0627\u0632\u06af\u0634\u062a \u0628\u0647 \u062e\u0627\u0646\u0647",
    imageAlt: "\u062a\u0635\u0648\u06cc\u0631\u0633\u0627\u0632\u06cc \u062e\u0637\u0627\u06cc 404",
  },
  en: {
    title: "404 not found",
    description: "The page you are looking for might have been moved, renamed, or might never have existed.",
    action: "Back To Home",
    imageAlt: "404 error illustration",
  },
  de: {
    title: "404 nicht gefunden",
    description: "Die gesuchte Seite wurde moglicherweise verschoben, umbenannt oder existiert nicht.",
    action: "Zuruck zur Startseite",
    imageAlt: "404 Fehlerillustration",
  },
} as const;

export default async function NotFound() {
  const locale = await getLocale();
  const content = locale === "fa" ? copy.fa : locale === "en" ? copy.en : copy.de;
  const appLocale = isAppLocale(locale) ? locale : "de";
  const BackIcon = locale === "fa" ? FiArrowRight : FiArrowLeft;

  return (
    <section className="fargo-not-found-page h-[calc(100dvh-4rem)] overflow-hidden bg-white px-4 py-4 sm:px-6 lg:h-[calc(100dvh-4.75rem)]">
      <NotFoundTelemetry />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            body:has(.fargo-not-found-page) header {
              background: rgb(255 255 255 / 0.96) !important;
              border-bottom: 1px solid rgb(226 232 240 / 0.9) !important;
              box-shadow: 0 6px 30px rgb(15 23 42 / 0.08) !important;
              backdrop-filter: blur(16px);
            }

            html:has(.fargo-not-found-page),
            body:has(.fargo-not-found-page),
            body:has(.fargo-not-found-page) main {
              overflow: hidden !important;
            }

            body:has(.fargo-not-found-page) header a[aria-label="Fargo"] > span:last-child,
            body:has(.fargo-not-found-page) header nav a,
            body:has(.fargo-not-found-page) header a[href*="/login"] {
              color: #0f172a !important;
            }

            body:has(.fargo-not-found-page) header nav a:hover,
            body:has(.fargo-not-found-page) header a[href*="/login"]:hover {
              color: #f15b3f !important;
            }

            body:has(.fargo-not-found-page) header .dropdown > div[role="button"] > button {
              background: #f15b3f !important;
              border-color: #f15b3f !important;
              color: #ffffff !important;
            }

            body:has(.fargo-not-found-page) header .dropdown > div[role="button"] > button,
            body:has(.fargo-not-found-page) header .dropdown > div[role="button"] > button * {
              color: #ffffff !important;
            }

            body:has(.fargo-not-found-page) header a[href*="/register"],
            body:has(.fargo-not-found-page) header a[href*="/dashboard"] {
              background: #ffffff !important;
              border-color: #e2e8f0 !important;
              color: #334155 !important;
            }

            body:has(.fargo-not-found-page) header > div > div > button[aria-label] {
              background: #ffffff !important;
              border-color: #e2e8f0 !important;
              color: #1e293b !important;
            }
          `,
        }}
      />
      <div className="mx-auto flex h-full w-full min-w-0 max-w-5xl flex-col items-center justify-center text-center">
        <div className="min-h-0 w-full min-w-0 flex-1 overflow-hidden">
          <img
            src="/images/404-illustration.png"
            alt={content.imageAlt}
            width={1536}
            height={1024}
            fetchPriority="high"
            className="h-full w-full object-contain object-center"
          />
        </div>
        <div className="flex w-full shrink-0 flex-col items-center pb-2">
          <h1 className="w-full min-w-0 text-3xl font-black leading-tight text-[#191d21] sm:text-5xl lg:text-6xl">
            {content.title}
          </h1>
          <p className="mt-3 w-full min-w-0 max-w-[22rem] break-words text-center text-sm leading-7 text-[#777] sm:max-w-3xl sm:text-lg lg:text-xl">
            {content.description}
          </p>
          <Link
            href={localizePathname("/", appLocale)}
            className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-primary px-7 text-base font-black !text-white shadow-[0_18px_38px_rgba(241,91,63,.2)] transition hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:min-h-14 sm:px-9 sm:text-lg"
          >
            <BackIcon />
            {content.action}
          </Link>
        </div>
      </div>
    </section>
  );
}
