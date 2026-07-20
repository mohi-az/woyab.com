import { redirect } from "next/navigation";
import { AdminTwoFactorSetup } from "@/components/dashboard/AdminTwoFactorSetup";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export default async function AdminTwoFactorPage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { role: true, twoFactorEnabledAt: true },
  });
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") redirect("/dashboard/security");
  return (
    <div>
      <h1 className="mb-2 text-2xl font-black">Administrator two-factor authentication</h1>
      <p className="mb-6 text-sm text-slate-600">Protect privileged access with a time-based one-time password.</p>
      <AdminTwoFactorSetup enabled={Boolean(user.twoFactorEnabledAt)} />
    </div>
  );
}
