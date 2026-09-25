import { createHash } from "node:crypto";

/**
 * Prisma include query specification to fetch all relations
 * required for constructing the business semantic document.
 */
export const businessDocumentInclude = {
  translations: {
    select: {
      locale: true,
      businessName: true,
      shortDescription: true,
      description: true,
    },
  },
  category: {
    select: {
      nameFa: true,
      nameEn: true,
      nameDe: true,
    },
  },
  subCategory: {
    select: {
      nameFa: true,
      nameEn: true,
      nameDe: true,
    },
  },
  tags: {
    select: {
      tag: {
        select: {
          nameFa: true,
          nameEn: true,
          nameDe: true,
        },
      },
    },
  },
  services: {
    where: { active: true },
    select: {
      title: true,
      description: true,
    },
  },
  city: {
    select: {
      nameFa: true,
      nameEn: true,
    },
  },
  district: {
    select: {
      nameFa: true,
      nameEn: true,
    },
  },
  attributes: {
    select: {
      value: true,
      attribute: {
        select: {
          labelFa: true,
          labelEn: true,
          labelDe: true,
        },
      },
    },
  },
} as const;

export type BusinessForDocument = {
  id: string;
  businessName: string;
  shortDescription?: string | null;
  description?: string | null;
  address?: string | null;
  postalCode?: string | null;
  translations?: Array<{
    locale?: string;
    businessName: string;
    shortDescription?: string | null;
    description?: string | null;
  }>;
  category: {
    nameFa: string;
    nameEn: string;
    nameDe: string;
  };
  subCategory?: {
    nameFa: string;
    nameEn: string;
    nameDe: string;
  } | null;
  tags?: Array<{
    tag: {
      nameFa: string;
      nameEn?: string | null;
      nameDe?: string | null;
    };
  }>;
  services?: Array<{
    title: string;
    description?: string | null;
  }>;
  city?: {
    nameFa: string;
    nameEn: string;
  } | null;
  district?: {
    nameFa: string;
    nameEn?: string | null;
  } | null;
  attributes?: Array<{
    value: string;
    attribute: {
      labelFa: string;
      labelEn?: string | null;
      labelDe?: string | null;
    };
  }>;
};

export type BusinessDocument = {
  businessId: string;
  text: string;
  hash: string;
};

/**
 * Builds a comprehensive, multilingual textual representation of a business
 * optimized for semantic search indexing with embedding models.
 * Also computes a deterministic SHA-256 hash to detect changes.
 */
export function buildBusinessDocument(business: BusinessForDocument): BusinessDocument {
  const parts: string[] = [];

  // 1. Business names (primary + translations in all languages)
  const names = new Set<string>();
  if (business.businessName?.trim()) {
    names.add(business.businessName.trim());
  }
  for (const t of business.translations ?? []) {
    if (t.businessName?.trim()) {
      names.add(t.businessName.trim());
    }
  }
  if (names.size > 0) {
    parts.push(Array.from(names).join(" - "));
  }

  // 2. Category & SubCategory (FA, EN, DE)
  if (business.category) {
    const cat = business.category;
    const catNames = [cat.nameFa, cat.nameEn, cat.nameDe]
      .map((s) => s?.trim())
      .filter((s): s is string => Boolean(s));
    if (catNames.length > 0) {
      parts.push(`دسته‌بندی: ${catNames.join(" | ")}`);
    }
  }

  if (business.subCategory) {
    const sub = business.subCategory;
    const subNames = [sub.nameFa, sub.nameEn, sub.nameDe]
      .map((s) => s?.trim())
      .filter((s): s is string => Boolean(s));
    if (subNames.length > 0) {
      parts.push(`زیردسته: ${subNames.join(" | ")}`);
    }
  }

  // 3. Descriptions (primary + translations)
  const descriptions = new Set<string>();
  if (business.shortDescription?.trim()) {
    descriptions.add(business.shortDescription.trim());
  }
  if (business.description?.trim()) {
    descriptions.add(business.description.trim());
  }
  for (const t of business.translations ?? []) {
    if (t.shortDescription?.trim()) {
      descriptions.add(t.shortDescription.trim());
    }
    if (t.description?.trim()) {
      descriptions.add(t.description.trim());
    }
  }
  for (const desc of descriptions) {
    parts.push(desc);
  }

  // 4. Services
  const services = (business.services ?? []).filter((s) => Boolean(s.title?.trim()));
  if (services.length > 0) {
    const serviceStrings = services.map((s) => {
      const title = s.title.trim();
      const desc = s.description?.trim();
      return desc ? `${title}: ${desc}` : title;
    });
    parts.push(`خدمات: ${serviceStrings.join(", ")}`);
  }

  // 5. Tags (multilingual)
  const tags = (business.tags ?? []).filter((t) => t.tag);
  if (tags.length > 0) {
    const tagStrings = tags
      .map((t) =>
        [t.tag.nameFa, t.tag.nameEn, t.tag.nameDe]
          .map((s) => s?.trim())
          .filter((s): s is string => Boolean(s))
          .join(" ")
      )
      .filter(Boolean);
    if (tagStrings.length > 0) {
      parts.push(`تگ‌ها: ${tagStrings.join(", ")}`);
    }
  }

  // 6. Attributes (e.g. WiFi, Parking, Delivery, Halal)
  const attributes = (business.attributes ?? []).filter((a) => a.attribute && a.value?.trim());
  if (attributes.length > 0) {
    const attrStrings = attributes.map((a) => {
      const label = a.attribute.labelFa?.trim() || a.attribute.labelEn?.trim() || "ویژگی";
      return `${label}: ${a.value.trim()}`;
    });
    parts.push(`ویژگی‌ها: ${attrStrings.join(", ")}`);
  }

  // 7. Location (City, District, Address, PostalCode)
  const locParts: string[] = [];
  if (business.city) {
    const cityNames = [business.city.nameFa, business.city.nameEn]
      .map((s) => s?.trim())
      .filter((s): s is string => Boolean(s));
    if (cityNames.length > 0) {
      locParts.push(`شهر: ${cityNames.join(" / ")}`);
    }
  }
  if (business.district) {
    const districtNames = [business.district.nameFa, business.district.nameEn]
      .map((s) => s?.trim())
      .filter((s): s is string => Boolean(s));
    if (districtNames.length > 0) {
      locParts.push(`منطقه: ${districtNames.join(" / ")}`);
    }
  }
  if (business.address?.trim()) {
    locParts.push(`آدرس: ${business.address.trim()}`);
  }
  if (business.postalCode?.trim()) {
    locParts.push(`کد پستی: ${business.postalCode.trim()}`);
  }
  if (locParts.length > 0) {
    parts.push(locParts.join(" | "));
  }

  const text = parts.join("\n").trim();
  const hash = createHash("sha256").update(text).digest("hex");

  return {
    businessId: business.id,
    text,
    hash,
  };
}
