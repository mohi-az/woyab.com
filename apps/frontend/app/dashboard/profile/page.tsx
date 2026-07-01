import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, phone: true, avatarUrl: true } });
  return <><h1 className="mb-6 text-2xl font-black">پروفایل من</h1><ProfileForm initial={{ name: user.name ?? "", email: user.email ?? "", phone: user.phone ?? "", avatarUrl: user.avatarUrl ?? "" }} /></>;
}
