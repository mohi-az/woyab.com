import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function currentUserId() {
  const session = await auth();
  return session?.user && !session.user.invalid ? session.user.id : null;
}

export async function requireUserId() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  return userId;
}
