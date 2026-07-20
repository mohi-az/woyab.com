import { redirectWithLocale } from "@/i18n/server";

export default async function OldOwnerAnalyticsPage() {
  await redirectWithLocale("/business-portal/analytics");
}