import { NextRequest, NextResponse } from "next/server";
import { isAppLocale } from "@/i18n/config";
import { prisma } from "@/lib/prisma";

const localeMap = { de: "DE", en: "EN", fa: "FA" } as const;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 120) ?? "";
  const requestedLocale = request.nextUrl.searchParams.get("locale");
  const locale = isAppLocale(requestedLocale) ? requestedLocale : "de";

  if (query.length < 2) {
    return NextResponse.json({ success: true, data: { items: [] } });
  }

  const businesses = await prisma.business.findMany({
    where: {
      removedAt: null,
      status: "ACTIVE",
      OR: [
        { businessName: { contains: query, mode: "insensitive" } },
        { legalName: { contains: query, mode: "insensitive" } },
        { translations: { some: { businessName: { contains: query, mode: "insensitive" } } } },
      ],
    },
    orderBy: [{ verified: "desc" }, { businessName: "asc" }],
    take: 5,
    select: {
      id: true,
      slug: true,
      businessName: true,
      translations: {
        where: { locale: localeMap[locale] },
        take: 1,
        select: { businessName: true },
      },
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      items: businesses.map((business) => ({
        id: business.id,
        slug: business.slug,
        title: business.translations[0]?.businessName || business.businessName,
      })),
    },
  });
}
