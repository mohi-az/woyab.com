import { SecurityForms } from "@/components/dashboard/SecurityForms";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export default async function SecurityPage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  return <><h1 className="mb-6 text-2xl font-black">امنیت حساب</h1><SecurityForms hasPassword={Boolean(user.passwordHash)} /></>;
}
