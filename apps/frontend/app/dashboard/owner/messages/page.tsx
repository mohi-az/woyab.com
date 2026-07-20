import { redirectWithLocale } from "@/i18n/server";

export default async function OldOwnerMessagesPage() {
  await redirectWithLocale("/business-portal/messages");
}