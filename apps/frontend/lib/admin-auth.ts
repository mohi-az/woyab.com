import "server-only";

import type { UserRole } from "@woyab/database";
import { auth } from "@/auth";
import { redirectWithLocale } from "@/i18n/server";
import { prisma } from "@/lib/prisma";

const adminRoles: UserRole[] = ["ADMIN", "SUPER_ADMIN"];
const superAdminRoles: UserRole[] = ["SUPER_ADMIN"];

export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id || session.user.invalid) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
      active: true,
      twoFactorEnabledAt: true,
    },
  });
  return user ? { ...user, twoFactorVerified: Boolean(session.user.twoFactorVerified) } : null;
}

export async function requireRole(roles: UserRole[]) {
  const user = await currentUser();
  if (!user) {
    await redirectWithLocale("/login");
    throw new Error("Redirecting to login.");
  }
  if (!user.active || !roles.includes(user.role)) {
    await redirectWithLocale("/dashboard");
    throw new Error("Redirecting to dashboard.");
  }
  if (adminRoles.includes(user.role)) {
    if (!user.twoFactorEnabledAt) {
      await redirectWithLocale("/dashboard/security/admin-2fa");
      throw new Error("Administrator two-factor enrollment is required.");
    }
    if (!user.twoFactorVerified) {
      await redirectWithLocale("/verify-2fa?callbackUrl=/admin");
      throw new Error("Administrator two-factor verification is required.");
    }
  }
  return user;
}

export async function requireAdmin() {
  return requireRole(adminRoles);
}

export async function requireSuperAdmin() {
  return requireRole(superAdminRoles);
}

export function isAdminRole(role: UserRole) {
  return adminRoles.includes(role);
}
