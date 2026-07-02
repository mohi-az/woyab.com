import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, avatarUrl: true } });
  return <div className="min-h-[75vh] bg-[#f8f5f1] px-4 py-8 sm:px-6"><div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[250px_1fr]">
    <DashboardSidebar initialUser={{ name: user.name ?? "", email: user.email, avatarUrl: user.avatarUrl }} />
    <section className="min-w-0">{children}</section>
  </div></div>;
}
