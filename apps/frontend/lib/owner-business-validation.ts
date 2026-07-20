import { z } from "zod";

export type OwnerBusinessContentLocale = "DE" | "EN" | "FA";

const contentLocales: OwnerBusinessContentLocale[] = ["DE", "EN", "FA"];

function messages(locale: string) {
  if (locale === "fa") {
    return {
      required: "تکمیل این فیلد الزامی است.",
      nameLength: "نام کسب‌وکار باید بین ۲ تا ۲۰۰ کاراکتر باشد.",
      email: "فرمت ایمیل صحیح نیست.",
      phone: "فرمت شماره تلفن صحیح نیست.",
      website: "آدرس وب‌سایت باید معتبر و با https:// آغاز شود.",
      postalCode: "کد پستی باید پنج رقم باشد.",
      selection: "یک گزینه معتبر انتخاب کنید.",
      googlePlaceId: "فرمت Google Place ID صحیح نیست.",
      shortDescription: "توضیح کوتاه نباید بیشتر از ۳۰۰ کاراکتر باشد.",
      description: "توضیحات نباید بیشتر از ۵۰۰۰ کاراکتر باشد.",
      coordinates: "مختصات واردشده معتبر نیست.",
    };
  }
  if (locale === "de") {
    return {
      required: "Dieses Feld ist erforderlich.",
      nameLength: "Der Unternehmensname muss 2 bis 200 Zeichen lang sein.",
      email: "Das E-Mail-Format ist ungültig.",
      phone: "Das Telefonnummernformat ist ungültig.",
      website: "Die Website muss eine gültige HTTPS-Adresse sein.",
      postalCode: "Die Postleitzahl muss aus fünf Ziffern bestehen.",
      selection: "Wählen Sie eine gültige Option.",
      googlePlaceId: "Das Format der Google Place ID ist ungültig.",
      shortDescription: "Die Kurzbeschreibung darf maximal 300 Zeichen enthalten.",
      description: "Die Beschreibung darf maximal 5.000 Zeichen enthalten.",
      coordinates: "Die Koordinaten sind ungültig.",
    };
  }
  return {
    required: "This field is required.",
    nameLength: "Business name must be between 2 and 200 characters.",
    email: "The email format is invalid.",
    phone: "The phone number format is invalid.",
    website: "The website must be a valid HTTPS address.",
    postalCode: "Postal code must contain five digits.",
    selection: "Select a valid option.",
    googlePlaceId: "The Google Place ID format is invalid.",
    shortDescription: "Short description cannot exceed 300 characters.",
    description: "Description cannot exceed 5,000 characters.",
    coordinates: "The coordinates are invalid.",
  };
}

const emptyOr = <T extends z.ZodType<string>>(schema: T) => z.union([z.literal(""), schema]);

function stepShapes(sourceLocale: OwnerBusinessContentLocale, locale: string) {
  const t = messages(locale);
  const phone = emptyOr(z.string().trim().regex(/^[+0-9() .-]{6,30}$/, t.phone));
  const optionalCoordinate = (minimum: number, maximum: number) => emptyOr(
    z.string().trim().refine((value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum;
    }, t.coordinates),
  );

  const contentShape: Record<string, z.ZodType> = {};
  for (const contentLocale of contentLocales) {
    contentShape[`businessName_${contentLocale}`] = contentLocale === sourceLocale
      ? z.string().trim().min(2, t.nameLength).max(200, t.nameLength)
      : z.string().trim().max(200, t.nameLength);
    contentShape[`shortDescription_${contentLocale}`] = z.string().trim().max(300, t.shortDescription);
    contentShape[`description_${contentLocale}`] = z.string().trim().max(5000, t.description);
  }

  return [
    {
      slug: z.string().trim().regex(/^[a-z0-9-]+$/, t.required),
      sourceLocale: z.enum(contentLocales),
      [`businessName_${sourceLocale}`]: z.string().trim().min(2, t.nameLength).max(200, t.nameLength),
      legalName: z.string().trim().max(200, t.nameLength),
      email: emptyOr(z.string().trim().pipe(z.email(t.email).max(254, t.email))),
      phone,
      mobile: phone,
      website: emptyOr(z.string().trim().pipe(z.url(t.website).max(2048, t.website).refine((value) => value.startsWith("https://"), t.website))),
      postalCode: emptyOr(z.string().trim().regex(/^\d{5}$/, t.postalCode)),
    },
    {
      categoryId: z.string().trim().regex(/^[1-9]\d*$/, t.selection),
      cityId: z.string().trim().regex(/^[1-9]\d*$/, t.selection),
      subCategoryId: emptyOr(z.string().trim().regex(/^[1-9]\d*$/, t.selection)),
      specialtyId: emptyOr(z.string().trim().regex(/^[1-9]\d*$/, t.selection)).optional(),
    },
    contentShape,
    {
      googlePlaceId: emptyOr(z.string().trim().regex(/^[A-Za-z0-9_-]{6,255}$/, t.googlePlaceId)),
    },
    {},
    {},
    {},
    {
      latitude: optionalCoordinate(-90, 90).optional(),
      longitude: optionalCoordinate(-180, 180).optional(),
    },
    {},
  ] satisfies Array<Record<string, z.ZodType>>;
}

export function ownerBusinessWizardStepSchema(
  step: number,
  sourceLocale: OwnerBusinessContentLocale,
  locale: string,
) {
  return z.object(stepShapes(sourceLocale, locale)[step] ?? {});
}

export function ownerBusinessWizardSchema(sourceLocale: OwnerBusinessContentLocale, locale: string) {
  return z.object(Object.assign({}, ...stepShapes(sourceLocale, locale)));
}

export function ownerBusinessWizardErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}
