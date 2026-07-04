import "server-only";

import type { UserRole } from "@fargo/database";
import { auth } from "@/auth";
import { redirectWithLocale } from "@/i18n/server";
import { prisma } from "@/lib/prisma";

const adminRoles: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id || session.user.invalid) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
      active: true,
    },
  });
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
  return user;
}

export async function requireAdmin() {
  return requireRole(adminRoles);
}

export function isAdminRole(role: UserRole) {
  return adminRoles.includes(role);
}
