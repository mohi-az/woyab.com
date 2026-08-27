import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FiMail, FiShield } from "react-icons/fi";
import { ContactForm } from "@/components/contact/ContactForm";
import Footer from "@/components/layout/Footer";
import { privacyEmail, supportEmail } from "@/lib/mail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Contact");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function ContactPage() {
  const t = await getTranslations("Contact");
  const support = supportEmail();
  const privacy = privacyEmail();

  return (
    <>
      <section className="bg-slate-950 px-5 py-16 text-white sm:px-6 lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-primary-light">WoYab</p>
          <h1 className="mt-4 text-4xl font-black sm:text-5xl">{t("title")}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">{t("description")}</p>
        </div>
      </section>
      <section className="bg-slate-50 px-5 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <h2 className="text-2xl font-black text-slate-950">{t("formTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{t("formDescription")}</p>
            <div className="mt-7"><ContactForm /></div>
          </div>
          <aside className="space-y-5">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <FiMail className="text-2xl text-primary" />
              <h2 className="mt-4 text-lg font-black text-slate-950">{t("supportTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{t("supportDescription")}</p>
              <a href={`mailto:${support}`} className="mt-4 inline-block break-all font-bold text-primary underline underline-offset-4">{support}</a>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <FiShield className="text-2xl text-primary" />
              <h2 className="mt-4 text-lg font-black text-slate-950">{t("privacyTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{t("privacyDescription")}</p>
              <a href={`mailto:${privacy}`} className="mt-4 inline-block break-all font-bold text-primary underline underline-offset-4">{privacy}</a>
            </div>
          </aside>
        </div>
      </section>
      <Footer />
    </>
  );
}
