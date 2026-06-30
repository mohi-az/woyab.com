import type { ElementType, SVGProps } from "react";
import {
  MdDirectionsCar,
  MdFlight,
  MdHomeRepairService,
  MdLocalHospital,
  MdRestaurant,
  MdSchool,
  MdSpa,
  MdStorefront,
  MdWorkOutline,
} from "react-icons/md";

export type CategoryDef = {
  dbId: number;
  labelKey: string;
  icon: ElementType;
  slug: string;
};

export const FEATURED_CATEGORIES: CategoryDef[] = [
  { dbId: 1, labelKey: "restaurantCafe", icon: MdRestaurant, slug: "restaurant-cafe" },
  { dbId: 2, labelKey: "healthBeauty", icon: MdSpa, slug: "health-beauty" },
  { dbId: 4, labelKey: "homeServices", icon: MdHomeRepairService, slug: "home-services" },
  { dbId: 5, labelKey: "automotive", icon: MdDirectionsCar, slug: "automotive" },
  { dbId: 6, labelKey: "retail", icon: MdStorefront, slug: "retail" },
  { dbId: 7, labelKey: "education", icon: MdSchool, slug: "education" },
  { dbId: 8, labelKey: "medical", icon: MdLocalHospital, slug: "medical" },
  { dbId: 10, labelKey: "travelTransport", icon: MdFlight, slug: "travel-transport" },
];

const categoryIconBySlug: Record<string, ElementType> = Object.fromEntries(
  FEATURED_CATEGORIES.map((category) => [category.slug, category.icon]),
);

export function getCategoryIcon(categorySlug?: string | null): ElementType {
  if (!categorySlug) return MdWorkOutline;
  return categoryIconBySlug[categorySlug] ?? MdWorkOutline;
}

type CategoryIconProps = SVGProps<SVGSVGElement> & {
  categorySlug?: string | null;
};

export function CategoryIcon({ categorySlug, ...props }: CategoryIconProps) {
  switch (categorySlug) {
    case "restaurant-cafe":
      return <MdRestaurant {...props} />;
    case "health-beauty":
      return <MdSpa {...props} />;
    case "home-services":
      return <MdHomeRepairService {...props} />;
    case "automotive":
      return <MdDirectionsCar {...props} />;
    case "retail":
      return <MdStorefront {...props} />;
    case "education":
      return <MdSchool {...props} />;
    case "medical":
      return <MdLocalHospital {...props} />;
    case "travel-transport":
      return <MdFlight {...props} />;
    default:
      return <MdWorkOutline {...props} />;
  }
}
