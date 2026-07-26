import { SecurityForms } from "@/components/dashboard/SecurityForms";
import { TwoFactorSetup } from "@/components/dashboard/TwoFactorSetup";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

export default async function SecurityPage() {
  const [userId, t] = await Promise.all([requireUserId(), getTranslations("Dashboard.security")]);
  const user = await prisma.user.findUniqueOrThrow({ 
    where: { id: userId }, 
    select: { passwordHash: true, twoFactorEnabledAt: true } 
  });
  return (
    <>
      <h1 className="mb-6 text-2xl font-black">{t("title")}</h1>
      <div className="space-y-6">
        <SecurityForms hasPassword={Boolean(user.passwordHash)} />
        <TwoFactorSetup enabled={Boolean(user.twoFactorEnabledAt)} hasPassword={Boolean(user.passwordHash)} />
      </div>
    </>
  );
}
