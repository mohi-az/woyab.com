import type { ElementType } from "react";
import { DynamicIcon, getDynamicIconComponent, normalizeIconKey } from "@/components/icons/DynamicIcon";

export type CategoryDef = {
  dbId: number;
  labelKey: string;
  iconKey: string;
  icon: ElementType;
  slug: string;
};

export const FEATURED_CATEGORIES: CategoryDef[] = [
  { dbId: 1, labelKey: "restaurantCafe", iconKey: "md:MdRestaurant", icon: getDynamicIconComponent("md:MdRestaurant"), slug: "restaurants-cafes" },
  { dbId: 2, labelKey: "healthBeauty", iconKey: "md:MdSpa", icon: getDynamicIconComponent("md:MdSpa"), slug: "beauty-wellness" },
  { dbId: 4, labelKey: "homeServices", iconKey: "md:MdHomeRepairService", icon: getDynamicIconComponent("md:MdHomeRepairService"), slug: "home-services" },
  { dbId: 5, labelKey: "automotive", iconKey: "md:MdDirectionsCar", icon: getDynamicIconComponent("md:MdDirectionsCar"), slug: "automotive" },
  { dbId: 6, labelKey: "retail", iconKey: "md:MdStorefront", icon: getDynamicIconComponent("md:MdStorefront"), slug: "retail" },
  { dbId: 7, labelKey: "education", iconKey: "md:MdSchool", icon: getDynamicIconComponent("md:MdSchool"), slug: "education" },
  { dbId: 8, labelKey: "medical", iconKey: "md:MdLocalHospital", icon: getDynamicIconComponent("md:MdLocalHospital"), slug: "medical" },
  { dbId: 10, labelKey: "travelTransport", iconKey: "md:MdFlight", icon: getDynamicIconComponent("md:MdFlight"), slug: "travel-transport" },
];

export const iconKeyByCategorySlug: Record<string, string> = {
  "restaurants-cafes": "md:MdRestaurant",
  "beauty-wellness": "md:MdSpa",
  "legal-financial": "md:MdAccountBalance",
  "home-services": "md:MdHomeRepairService",
  automotive: "md:MdDirectionsCar",
  retail: "md:MdStorefront",
  education: "md:MdSchool",
  medical: "md:MdLocalHospital",
  "media-events": "md:MdCelebration",
  "travel-transport": "md:MdFlight",
};

export function resolveCategoryIconKey(iconKey?: string | null, categorySlug?: string | null) {
  return normalizeIconKey(iconKey ?? (categorySlug ? iconKeyByCategorySlug[categorySlug] : undefined));
}

export function getCategoryIcon(iconKey?: string | null, categorySlug?: string | null): ElementType {
  return getDynamicIconComponent(resolveCategoryIconKey(iconKey, categorySlug));
}

type CategoryIconProps = {
  iconKey?: string | null;
  categorySlug?: string | null;
  className?: string;
};

export function CategoryIcon({ iconKey, categorySlug, className }: CategoryIconProps) {
  return <DynamicIcon iconKey={resolveCategoryIconKey(iconKey, categorySlug)} className={className} />;
}
