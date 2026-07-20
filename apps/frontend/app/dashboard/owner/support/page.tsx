import { redirectWithLocale } from "@/i18n/server";

export default async function OldOwnerSupportPage() {
  await redirectWithLocale("/business-portal/support");
}