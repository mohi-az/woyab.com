import type { AttributeDataType, Prisma } from "@fargo/database";

export type BusinessAttributeDefinition = {
  id: number;
  key: string;
  labelFa: string;
  labelEn: string | null;
  labelDe: string | null;
  dataType: AttributeDataType;
  unit: string | null;
  options: string | null;
  sortOrder: number;
  active: boolean;
};

export type BusinessAttributeValue = {
  attributeId: number;
  value: string;
};

export const businessAttributeDefinitionSelect = {
  id: true,
  key: true,
  labelFa: true,
  labelEn: true,
  labelDe: true,
  dataType: true,
  unit: true,
  options: true,
  sortOrder: true,
  active: true,
} satisfies Prisma.AttributeDefinitionSelect;

export const businessAttributeValueSelect = {
  attributeId: true,
  value: true,
} satisfies Prisma.BusinessAttributeSelect;

export function businessAttributeFieldName(attributeId: number) {
  return `attribute_${attributeId}`;
}

export function businessAttributeLabel(definition: BusinessAttributeDefinition, locale?: string) {
  if (locale === "fa") return definition.labelFa;
  if (locale === "de") return definition.labelDe || definition.labelEn || definition.labelFa;
  return definition.labelEn || definition.labelDe || definition.labelFa;
}

export function formatAttributeValue(
  definition: BusinessAttributeDefinition,
  value: string,
  locale?: string,
) {
  if (definition.dataType === "BOOLEAN") return businessAttributeLabel(definition, locale);

  return value;
}

export function extractBusinessAttributeValues(
  formData: FormData,
  definitions: BusinessAttributeDefinition[],
) {
  return definitions.flatMap((definition) => {
    const fieldName = businessAttributeFieldName(definition.id);

    if (definition.dataType === "BOOLEAN") {
      return formData.get(fieldName) === "on" ? [{ attributeId: definition.id, value: "true" }] : [];
    }

    const raw = String(formData.get(fieldName) ?? "").trim();
    if (!raw) return [];

    if (definition.dataType === "NUMBER" && !Number.isFinite(Number(raw))) return [];
    return [{ attributeId: definition.id, value: raw }];
  });
}

export async function syncBusinessAttributes(
  tx: Prisma.TransactionClient,
  businessId: string,
  definitions: BusinessAttributeDefinition[],
  formData: FormData,
) {
  const definitionIds = definitions.map((definition) => definition.id);
  if (!definitionIds.length) return;

  const values = extractBusinessAttributeValues(formData, definitions);

  await tx.businessAttribute.deleteMany({
    where: {
      businessId,
      attributeId: { in: definitionIds },
    },
  });

  if (values.length) {
    await tx.businessAttribute.createMany({
      data: values.map((item) => ({
        businessId,
        attributeId: item.attributeId,
        value: item.value,
      })),
      skipDuplicates: true,
    });
  }
}
