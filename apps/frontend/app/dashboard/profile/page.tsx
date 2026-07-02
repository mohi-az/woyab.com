import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

export default async function ProfilePage() {
  const [userId, t] = await Promise.all([requireUserId(), getTranslations("Dashboard.profile")]);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, phone: true, avatarUrl: true } });
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-black text-slate-950">{t("title")}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{t("description")}</p>
      </div>
      <ProfileForm initial={{ name: user.name ?? "", email: user.email ?? "", phone: user.phone ?? "", avatarUrl: user.avatarUrl ?? "" }} />
    </>
  );
}
