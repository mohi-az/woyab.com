import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, avatarUrl: true, role: true, _count: { select: { businesses: true } } },
  });
  return <div className="min-h-[75vh] bg-[#f8f5f1] px-4 py-8 sm:px-6"><div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[250px_1fr]">
    <DashboardSidebar initialUser={{ name: user.name ?? "", email: user.email, avatarUrl: user.avatarUrl, role: user.role, hasBusinesses: user._count.businesses > 0 }} />
    <section className="min-w-0">{children}</section>
  </div></div>;
}
