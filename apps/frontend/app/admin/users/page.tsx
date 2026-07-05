import { getTranslations } from "next-intl/server";
import { AdminUsersTable, type AdminUserRow } from "@/components/admin/AdminUsersTable";
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

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const [params, t] = await Promise.all([searchParams, getTranslations("Admin")]);
  const page = pageNumber(first(params.page));
  const q = first(params.q)?.trim();
  const where = {
    role: "USER" as const,
    ...(q && {
      OR: [
        { email: { contains: q, mode: "insensitive" as const } },
        { name: { contains: q, mode: "insensitive" as const } },
        { phone: { contains: q, mode: "insensitive" as const } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
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
        _count: { select: { reviews: true, favorites: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const rows: AdminUserRow[] = users.map((user) => ({
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
    reviews: user._count.reviews,
    favorites: user._count.favorites,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">{t("users.title")}</h1>
      </div>

      <AdminSection title={t("users.list")}>
        <AdminUsersTable users={rows} total={total} page={page} pageSize={PAGE_SIZE} q={q} />
      </AdminSection>
    </div>
  );
}
