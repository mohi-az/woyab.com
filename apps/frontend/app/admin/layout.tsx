import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin-auth";
import { cookies } from "next/headers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, cookieStore] = await Promise.all([requireAdmin(), cookies()]);
  const initialTheme = cookieStore.get("woyab-admin-theme")?.value === "light" ? "light" : "dark";

  return (
    <AdminShell
      initialTheme={initialTheme}
      user={{
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
      }}
    >
      {children}
    </AdminShell>
  );
}
