import "server-only";

import { auth } from "@/auth";

export async function currentUserId() {
  const session = await auth();
  if (session?.user?.invalid) return null;
  return session?.user?.id ?? null;
}
