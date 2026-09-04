export const MEDICAL_CATEGORY_SLUG = "medical";
export const PHARMACY_SUBCATEGORY_SLUG = "pharmacy";

export function shouldShowBusinessRatings(
  categorySlug?: string | null,
  subCategorySlug?: string | null,
) {
  return categorySlug !== MEDICAL_CATEGORY_SLUG
    || subCategorySlug === PHARMACY_SUBCATEGORY_SLUG;
}

export function shouldShowBusinessGallery(categorySlug?: string | null) {
  return categorySlug !== MEDICAL_CATEGORY_SLUG;
}
