import { getLocale, getTranslations } from "next-intl/server";
import { FiBarChart2, FiBriefcase, FiCheckCircle, FiEdit, FiLayers, FiMessageSquare, FiStar } from "react-icons/fi";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { appLocale as toAppLocale, publicMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("ForBusinesses")]);
  return publicMetadata({
    locale: toAppLocale(locale),
    pathname: "/for-businesses",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function ForBusinessesPage() {
  const t = await getTranslations("ForBusinesses");

  const features = [
    { icon: FiBriefcase, title: t("feature1Title"), description: t("feature1Description") },
    { icon: FiBarChart2, title: t("feature2Title"), description: t("feature2Description") },
    { icon: FiMessageSquare, title: t("feature3Title"), description: t("feature3Description") },
    { icon: FiStar, title: t("feature4Title"), description: t("feature4Description") },
    { icon: FiLayers, title: t("feature5Title"), description: t("feature5Description") },
    { icon: FiEdit, title: t("feature6Title"), description: t("feature6Description") },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 px-4 py-20 text-white sm:px-6 lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(241,91,63,0.15),transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-primary-light">{t("heroEyebrow")}</p>
          <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            {t("heroDescription")}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/add-business"
              className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-primary px-8 text-base font-black text-white shadow-[0_9px_28px_rgba(241,91,63,0.35)] transition hover:bg-primary/90"
            >
              {t("heroPrimary")}
            </Link>
            <Link
              href="/business-portal"
              className="inline-flex min-h-14 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-8 text-base font-black text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              {t("heroSecondary")}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">{t("featuresTitle")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">{t("featuresDescription")}</p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-xl text-primary">
                  <Icon />
                </span>
                <h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="bg-[#f8f5f1] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Add new business */}
            <div className="rounded-[28px] bg-primary p-8 text-white shadow-[0_16px_50px_rgba(241,91,63,0.25)]">
              <h2 className="text-2xl font-black">{t("ctaTitle")}</h2>
              <p className="mt-3 text-sm leading-7 text-white/80">{t("ctaDescription")}</p>
              <Link
                href="/add-business"
                className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-6 text-sm font-black text-primary transition hover:bg-white/90"
              >
                <FiBriefcase />
                {t("ctaAction")}
              </Link>
            </div>

            {/* Claim existing */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">{t("claimTitle")}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">{t("claimDescription")}</p>
              <Link
                href="/add-business?intent=claim"
                className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-slate-950 px-6 text-sm font-black text-white transition hover:bg-slate-800"
              >
                <FiCheckCircle />
                {t("claimAction")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
