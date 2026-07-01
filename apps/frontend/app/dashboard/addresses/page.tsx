import { AddressManager } from "@/components/dashboard/AddressManager";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export default async function AddressesPage() {
  const userId = await requireUserId();
  const addresses = await prisma.userSavedLocation.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }] });
  return <><h1 className="mb-6 text-2xl font-black">آدرس‌های منتخب</h1><AddressManager initial={addresses.map((item) => ({ id: item.id, label: item.label, icon: item.icon, address: item.address, cityName: item.cityName ?? "", districtName: item.districtName ?? "", latitude: item.latitude, longitude: item.longitude, isDefault: item.isDefault }))} /></>;
}
