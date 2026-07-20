import { redirectWithLocale } from "@/i18n/server";

export default async function OldOwnerNewPage() {
  await redirectWithLocale("/business-portal/new");
}