import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin-auth";
import { cookies } from "next/headers";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, cookieStore] = await Promise.all([requireAdmin(), cookies()]);
  const initialTheme = cookieStore.get("fargo-admin-theme")?.value === "light" ? "light" : "dark";

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
