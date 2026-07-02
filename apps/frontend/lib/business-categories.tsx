import { createElement, type ElementType, type SVGProps } from "react";
import {
  MdAccountBalance,
  MdBakeryDining,
  MdCalculate,
  MdCameraAlt,
  MdCarRental,
  MdCarRepair,
  MdCelebration,
  MdCheckroom,
  MdCleaningServices,
  MdContentCut,
  MdDirectionsCar,
  MdElectricalServices,
  MdFlight,
  MdGavel,
  MdHomeRepairService,
  MdKitchen,
  MdLanguage,
  MdLocalCafe,
  MdLocalCarWash,
  MdLocalGroceryStore,
  MdLocalHospital,
  MdLocalShipping,
  MdMedicalServices,
  MdMusicNote,
  MdPlumbing,
  MdPsychology,
  MdRestaurant,
  MdSchool,
  MdShield,
  MdSpa,
  MdStorefront,
  MdTraffic,
  MdTravelExplore,
  MdVideocam,
  MdWorkOutline,
} from "react-icons/md";

export type CategoryDef = {
  dbId: number;
  labelKey: string;
  icon: ElementType;
  slug: string;
};

const ICON_COMPONENTS: Record<string, ElementType> = {
  accounting: MdCalculate,
  "aesthetic-clinic": MdMedicalServices,
  bakery: MdBakeryDining,
  balance: MdAccountBalance,
  cafe: MdLocalCafe,
  camera: MdCameraAlt,
  car: MdDirectionsCar,
  "car-dealer": MdDirectionsCar,
  "car-rental": MdCarRental,
  "car-repair": MdCarRepair,
  "car-wash": MdLocalCarWash,
  celebration: MdCelebration,
  cleaning: MdCleaningServices,
  clothing: MdCheckroom,
  dentist: MdMedicalServices,
  doctor: MdLocalHospital,
  "driving-school": MdTraffic,
  electrical: MdElectricalServices,
  flight: MdFlight,
  gavel: MdGavel,
  grocery: MdLocalGroceryStore,
  "hair-salon": MdContentCut,
  "home-appliances": MdKitchen,
  "home-repair": MdHomeRepairService,
  insurance: MdShield,
  language: MdLanguage,
  medical: MdLocalHospital,
  music: MdMusicNote,
  plumbing: MdPlumbing,
  psychology: MdPsychology,
  restaurant: MdRestaurant,
  school: MdSchool,
  spa: MdSpa,
  storefront: MdStorefront,
  transport: MdLocalShipping,
  travel: MdTravelExplore,
  video: MdVideocam,
};

export const FEATURED_CATEGORIES: CategoryDef[] = [
  { dbId: 1, labelKey: "restaurantCafe", icon: MdRestaurant, slug: "restaurants-cafes" },
  { dbId: 2, labelKey: "healthBeauty", icon: MdSpa, slug: "beauty-wellness" },
  { dbId: 4, labelKey: "homeServices", icon: MdHomeRepairService, slug: "home-services" },
  { dbId: 5, labelKey: "automotive", icon: MdDirectionsCar, slug: "automotive" },
  { dbId: 6, labelKey: "retail", icon: MdStorefront, slug: "retail" },
  { dbId: 7, labelKey: "education", icon: MdSchool, slug: "education" },
  { dbId: 8, labelKey: "medical", icon: MdLocalHospital, slug: "medical" },
  { dbId: 10, labelKey: "travelTransport", icon: MdFlight, slug: "travel-transport" },
];

export const iconKeyByCategorySlug: Record<string, string> = {
  "restaurants-cafes": "restaurant",
  "beauty-wellness": "spa",
  "legal-financial": "balance",
  "home-services": "home-repair",
  automotive: "car",
  retail: "storefront",
  education: "school",
  medical: "medical",
  "media-events": "celebration",
  "travel-transport": "flight",
};

export function resolveCategoryIconKey(iconKey?: string | null, categorySlug?: string | null) {
  return iconKey ?? (categorySlug ? iconKeyByCategorySlug[categorySlug] : undefined) ?? "work-outline";
}

export function getCategoryIcon(iconKey?: string | null, categorySlug?: string | null): ElementType {
  const resolvedKey = resolveCategoryIconKey(iconKey, categorySlug);
  return resolvedKey ? ICON_COMPONENTS[resolvedKey] ?? MdWorkOutline : MdWorkOutline;
}

type CategoryIconProps = SVGProps<SVGSVGElement> & {
  iconKey?: string | null;
  categorySlug?: string | null;
};

export function CategoryIcon({ iconKey, categorySlug, ...props }: CategoryIconProps) {
  return createElement(getCategoryIcon(iconKey, categorySlug), props);
}
