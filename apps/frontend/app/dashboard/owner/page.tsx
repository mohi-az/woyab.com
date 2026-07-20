import { redirectWithLocale } from "@/i18n/server";

export default async function OldOwnerPage() {
  await redirectWithLocale("/business-portal");
}