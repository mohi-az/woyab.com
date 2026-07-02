import { SecurityForms } from "@/components/dashboard/SecurityForms";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

export default async function SecurityPage() {
  const [userId, t] = await Promise.all([requireUserId(), getTranslations("Dashboard.security")]);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  return <><h1 className="mb-6 text-2xl font-black">{t("title")}</h1><SecurityForms hasPassword={Boolean(user.passwordHash)} /></>;
}
