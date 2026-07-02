import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, phone: true, avatarUrl: true } });
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-black text-slate-950">پروفایل من</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">اطلاعات اصلی و تصویر پروفایل خود را مدیریت کنید.</p>
      </div>
      <ProfileForm initial={{ name: user.name ?? "", email: user.email ?? "", phone: user.phone ?? "", avatarUrl: user.avatarUrl ?? "" }} />
    </>
  );
}
