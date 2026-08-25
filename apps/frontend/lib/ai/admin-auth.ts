import "server-only";

import { currentUser } from "@/lib/admin-auth";

export async function authorizeAiAdminRequest() {
  const user = await currentUser();
  if (!user) return { ok: false as const, status: 401, message: "Authentication is required." };
  if (!user.active || user.role !== "SUPER_ADMIN") {
    return { ok: false as const, status: 403, message: "Super-admin access is required." };
  }
  if (!user.twoFactorEnabledAt || !user.twoFactorVerified) {
    return { ok: false as const, status: 403, message: "Verified two-factor authentication is required." };
  }
  return { ok: true as const, user };
}
