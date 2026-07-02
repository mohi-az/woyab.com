import { AddressManager } from "@/components/dashboard/AddressManager";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

export default async function AddressesPage() {
  const [userId, t] = await Promise.all([requireUserId(), getTranslations("Dashboard.addresses")]);
  const addresses = await prisma.userSavedLocation.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }] });
  return <>
    <div className="mb-6">
      <h1 className="text-3xl font-black text-slate-950">{t("title")}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">{t("description")}</p>
    </div>
    <AddressManager initial={addresses.map((item) => ({ id: item.id, label: item.label, icon: item.icon, address: item.address, cityName: item.cityName ?? "", districtName: item.districtName ?? "", latitude: item.latitude, longitude: item.longitude, isDefault: item.isDefault }))} />
  </>;
}
