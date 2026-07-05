import { getTranslations } from "next-intl/server";
import { AdminOwnersTable, type AdminOwnerRow } from "@/components/admin/AdminOwnersTable";
import { AdminSection } from "@/components/admin/AdminPrimitives";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function AdminOwnersPage({ searchParams }: PageProps) {
  const [params, t] = await Promise.all([searchParams, getTranslations("Admin")]);
  const page = pageNumber(first(params.page));
  const q = first(params.q)?.trim();
  const where = {
    role: "OWNER" as const,
    ...(q && {
      OR: [
        { email: { contains: q, mode: "insensitive" as const } },
        { name: { contains: q, mode: "insensitive" as const } },
        { phone: { contains: q, mode: "insensitive" as const } },
        { businesses: { some: { businessName: { contains: q, mode: "insensitive" as const } } } },
      ],
    }),
  };

  const [owners, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        active: true,
        createdAt: true,
        businesses: {
          orderBy: { updatedAt: "desc" },
          select: {
            businessName: true,
            slug: true,
            status: true,
            reviewCount: true,
          },
        },
        _count: { select: { businessClaims: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const rows: AdminOwnerRow[] = owners.map((owner) => {
    const businesses = owner.businesses;
    return {
      id: owner.id,
      email: owner.email,
      phone: owner.phone,
      name: owner.name,
      active: owner.active,
      createdAt: owner.createdAt.toISOString(),
      businesses: businesses.length,
      activeBusinesses: businesses.filter((business) => business.status === "ACTIVE").length,
      pendingBusinesses: businesses.filter((business) => business.status === "PENDING").length,
      suspendedBusinesses: businesses.filter((business) => business.status === "SUSPENDED").length,
      totalReviews: businesses.reduce((sum, business) => sum + business.reviewCount, 0),
      claims: owner._count.businessClaims,
      latestBusiness: businesses[0] ? { name: businesses[0].businessName, slug: businesses[0].slug } : null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">{t("owners.title")}</h1>
      </div>

      <AdminSection title={t("owners.list")}>
        <AdminOwnersTable owners={rows} total={total} page={page} pageSize={PAGE_SIZE} q={q} />
      </AdminSection>
    </div>
  );
}
