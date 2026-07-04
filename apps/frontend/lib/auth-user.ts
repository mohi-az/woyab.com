import "server-only";

import { auth } from "@/auth";
import { redirectWithLocale } from "@/i18n/server";

export async function currentUserId() {
  const session = await auth();
  return session?.user && !session.user.invalid ? session.user.id : null;
}

export async function requireUserId() {
  const userId = await currentUserId();
  if (!userId) await redirectWithLocale("/login");
  return userId;
}
