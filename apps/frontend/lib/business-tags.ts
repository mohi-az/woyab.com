import type { Prisma } from "@woyab/database";

export type BusinessTagOption = {
  id: number;
  nameFa: string;
  nameEn: string | null;
  nameDe: string | null;
  slug: string;
};

export type BusinessTagValue = {
  tagId: number;
};

export const businessTagOptionSelect = {
  id: true,
  nameFa: true,
  nameEn: true,
  nameDe: true,
  slug: true,
} satisfies Prisma.TagSelect;

export const businessTagValueSelect = {
  tagId: true,
} satisfies Prisma.BusinessTagSelect;

export function businessTagLabel(tag: BusinessTagOption, locale?: string) {
  if (locale === "fa") return tag.nameFa;
  if (locale === "de") return tag.nameDe || tag.nameEn || tag.nameFa;
  return tag.nameEn || tag.nameDe || tag.nameFa;
}

export function selectedTagIds(formData: FormData) {
  return [...new Set(formData.getAll("tagIds")
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0))];
}

export async function syncBusinessTags(
  tx: Prisma.TransactionClient,
  businessId: string,
  formData: FormData,
) {
  const tagIds = selectedTagIds(formData);

  await tx.businessTag.deleteMany({ where: { businessId } });
  if (!tagIds.length) return;

  await tx.businessTag.createMany({
    data: tagIds.map((tagId) => ({ businessId, tagId })),
    skipDuplicates: true,
  });
}
