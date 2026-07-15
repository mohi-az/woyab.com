import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AddBusinessSearch } from "@/features/businesses/AddBusinessSearch";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AddBusinessPage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: true },
  };
}

export default function AddBusinessPage() {
  return <AddBusinessSearch />;
}
