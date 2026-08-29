import { z } from "zod";
import { fetchBusinessDirectoryOptions } from "@/lib/business-directory-options";

const querySchema = z.object({
  locale: z.enum(["de", "en", "fa"]).default("de"),
  categoryId: z.coerce.number().int().positive().optional(),
  subCategoryId: z.coerce.number().int().positive().optional(),
  cityId: z.coerce.number().int().positive().optional(),
  tagIds: z.array(z.coerce.number().int().positive()).max(100).default([]),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = querySchema.safeParse({
    locale: url.searchParams.get("locale") ?? undefined,
    categoryId: url.searchParams.get("categoryId") ?? undefined,
    subCategoryId: url.searchParams.get("subCategoryId") ?? undefined,
    cityId: url.searchParams.get("cityId") ?? undefined,
    tagIds: url.searchParams.getAll("tagIds").flatMap((value) => value.split(",")).filter(Boolean),
  });

  if (!result.success) {
    return Response.json({ success: false, error: "Invalid filter options query" }, { status: 400 });
  }

  const data = await fetchBusinessDirectoryOptions(result.data.locale, result.data);
  return Response.json({ success: true, data });
}
