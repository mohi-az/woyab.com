import type { IconType } from "react-icons";
import { createElement } from "react";
import * as FaIcons from "react-icons/fa";
import * as FiIcons from "react-icons/fi";
import * as MdIcons from "react-icons/md";

type IconLibrary = "md" | "fa" | "fi";

type IconOption = {
  key: string;
  label: string;
  library: IconLibrary;
  icon: IconType;
};

const ICON_OPTIONS = [
  { key: "md:MdRestaurant", label: "Restaurant", library: "md", icon: MdIcons.MdRestaurant },
  { key: "md:MdLocalCafe", label: "Cafe", library: "md", icon: MdIcons.MdLocalCafe },
  { key: "md:MdLocalGroceryStore", label: "Grocery", library: "md", icon: MdIcons.MdLocalGroceryStore },
  { key: "md:MdStorefront", label: "Storefront", library: "md", icon: MdIcons.MdStorefront },
  { key: "md:MdLocalHospital", label: "Hospital", library: "md", icon: MdIcons.MdLocalHospital },
  { key: "md:MdMedicalServices", label: "Medical", library: "md", icon: MdIcons.MdMedicalServices },
  { key: "md:MdSpa", label: "Spa", library: "md", icon: MdIcons.MdSpa },
  { key: "md:MdContentCut", label: "Hair salon", library: "md", icon: MdIcons.MdContentCut },
  { key: "md:MdSchool", label: "School", library: "md", icon: MdIcons.MdSchool },
  { key: "md:MdLanguage", label: "Language", library: "md", icon: MdIcons.MdLanguage },
  { key: "md:MdGavel", label: "Legal", library: "md", icon: MdIcons.MdGavel },
  { key: "md:MdAccountBalance", label: "Finance", library: "md", icon: MdIcons.MdAccountBalance },
  { key: "md:MdCalculate", label: "Accounting", library: "md", icon: MdIcons.MdCalculate },
  { key: "md:MdDirectionsCar", label: "Automotive", library: "md", icon: MdIcons.MdDirectionsCar },
  { key: "md:MdCarRepair", label: "Car repair", library: "md", icon: MdIcons.MdCarRepair },
  { key: "md:MdFlight", label: "Flight", library: "md", icon: MdIcons.MdFlight },
  { key: "md:MdTravelExplore", label: "Travel", library: "md", icon: MdIcons.MdTravelExplore },
  { key: "md:MdLocalShipping", label: "Transport", library: "md", icon: MdIcons.MdLocalShipping },
  { key: "md:MdHomeRepairService", label: "Home repair", library: "md", icon: MdIcons.MdHomeRepairService },
  { key: "md:MdCleaningServices", label: "Cleaning", library: "md", icon: MdIcons.MdCleaningServices },
  { key: "md:MdElectricalServices", label: "Electrical", library: "md", icon: MdIcons.MdElectricalServices },
  { key: "md:MdPlumbing", label: "Plumbing", library: "md", icon: MdIcons.MdPlumbing },
  { key: "md:MdCameraAlt", label: "Photography", library: "md", icon: MdIcons.MdCameraAlt },
  { key: "md:MdVideocam", label: "Video", library: "md", icon: MdIcons.MdVideocam },
  { key: "md:MdMusicNote", label: "Music", library: "md", icon: MdIcons.MdMusicNote },
  { key: "md:MdCelebration", label: "Events", library: "md", icon: MdIcons.MdCelebration },
  { key: "fa:FaUtensils", label: "Utensils", library: "fa", icon: FaIcons.FaUtensils },
  { key: "fa:FaClinicMedical", label: "Clinic", library: "fa", icon: FaIcons.FaClinicMedical },
  { key: "fa:FaShoppingBag", label: "Shopping", library: "fa", icon: FaIcons.FaShoppingBag },
  { key: "fa:FaCarSide", label: "Car", library: "fa", icon: FaIcons.FaCarSide },
  { key: "fa:FaHome", label: "Home", library: "fa", icon: FaIcons.FaHome },
  { key: "fa:FaPlaneDeparture", label: "Plane", library: "fa", icon: FaIcons.FaPlaneDeparture },
  { key: "fa:FaBalanceScale", label: "Law", library: "fa", icon: FaIcons.FaBalanceScale },
  { key: "fa:FaGraduationCap", label: "Education", library: "fa", icon: FaIcons.FaGraduationCap },
  { key: "fi:FiBriefcase", label: "Briefcase", library: "fi", icon: FiIcons.FiBriefcase },
  { key: "fi:FiMapPin", label: "Location", library: "fi", icon: FiIcons.FiMapPin },
] satisfies IconOption[];

const ICON_ALIASES: Record<string, string> = {
  accounting: "md:MdCalculate",
  "aesthetic-clinic": "md:MdMedicalServices",
  bakery: "md:MdBakeryDining",
  balance: "md:MdAccountBalance",
  cafe: "md:MdLocalCafe",
  camera: "md:MdCameraAlt",
  car: "md:MdDirectionsCar",
  "car-dealer": "md:MdDirectionsCar",
  "car-rental": "md:MdCarRental",
  "car-repair": "md:MdCarRepair",
  "car-wash": "md:MdLocalCarWash",
  celebration: "md:MdCelebration",
  cleaning: "md:MdCleaningServices",
  clothing: "md:MdCheckroom",
  dentist: "md:MdMedicalServices",
  doctor: "md:MdLocalHospital",
  "driving-school": "md:MdTraffic",
  electrical: "md:MdElectricalServices",
  flight: "md:MdFlight",
  gavel: "md:MdGavel",
  grocery: "md:MdLocalGroceryStore",
  "hair-salon": "md:MdContentCut",
  "home-appliances": "md:MdKitchen",
  "home-repair": "md:MdHomeRepairService",
  insurance: "md:MdShield",
  language: "md:MdLanguage",
  medical: "md:MdLocalHospital",
  music: "md:MdMusicNote",
  plumbing: "md:MdPlumbing",
  psychology: "md:MdPsychology",
  restaurant: "md:MdRestaurant",
  school: "md:MdSchool",
  spa: "md:MdSpa",
  storefront: "md:MdStorefront",
  transport: "md:MdLocalShipping",
  travel: "md:MdTravelExplore",
  video: "md:MdVideocam",
  "work-outline": "fi:FiBriefcase",
};

const ICONS_BY_KEY = Object.fromEntries(ICON_OPTIONS.map((item) => [item.key, item.icon])) as Record<string, IconType>;

export const dynamicIconOptions = ICON_OPTIONS.map(({ key, label, library }) => ({ key, label, library }));

export function normalizeIconKey(iconKey?: string | null) {
  if (!iconKey) return "fi:FiBriefcase";
  return ICON_ALIASES[iconKey] ?? iconKey;
}

export function getDynamicIconComponent(iconKey?: string | null) {
  return ICONS_BY_KEY[normalizeIconKey(iconKey)] ?? FiIcons.FiBriefcase;
}

export function DynamicIcon({ iconKey, className, title }: {
  iconKey?: string | null;
  className?: string;
  title?: string;
}) {
  const Icon = getDynamicIconComponent(iconKey);
  return createElement(Icon, { className, title, "aria-hidden": title ? undefined : true });
}
