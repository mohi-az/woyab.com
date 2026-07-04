import { getTranslations } from "next-intl/server";
import { AdminButton, AdminSection, AdminTable, StatusBadge, tableClassName, tdClassName, thClassName } from "@/components/admin/AdminPrimitives";
import { updateUserAccess } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;
const roles = ["USER", "OWNER", "ADMIN", "SUPER_ADMIN"] as const;
const inputClassName = "admin-input h-10 min-w-0 rounded-lg px-3 text-sm outline-none focus:border-sky-400";

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
  const role = first(params.role);
  const q = first(params.q)?.trim();
  const where = {
    ...(roles.includes(role as (typeof roles)[number]) && { role: role as (typeof roles)[number] }),
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
        role: true,
        active: true,
        createdAt: true,
        _count: { select: { businesses: true, reviews: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">{t("users.title")}</h1>
        <p className="mt-2 text-slate-400">{t("users.description")}</p>
      </div>

      <AdminSection title={t("filters.title")}>
        <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]" method="get">
          <input name="q" defaultValue={q} placeholder={t("filters.search")} className="admin-input h-11 rounded-lg px-4 outline-none focus:border-sky-400" />
          <select name="role" defaultValue={role ?? ""} className="admin-input h-11 rounded-lg px-4 outline-none focus:border-sky-400">
            <option value="">{t("filters.allRoles")}</option>
            {roles.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <AdminButton>{t("actions.filter")}</AdminButton>
        </form>
      </AdminSection>

      <AdminSection title={t("users.list")} description={t("pagination.summary", { total, page, totalPages })}>
        <AdminTable>
          <table className={tableClassName}>
            <thead>
              <tr>
                <th className={thClassName}>{t("fields.user")}</th>
                <th className={thClassName}>{t("fields.role")}</th>
                <th className={thClassName}>{t("fields.status")}</th>
                <th className={thClassName}>{t("fields.activity")}</th>
                <th className={thClassName}>{t("fields.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className={tdClassName}>
                    <div className="font-black text-white">{user.name || t("shell.fallbackName")}</div>
                    <div className="mt-1 text-xs text-slate-400">{user.email || user.phone || user.id}</div>
                  </td>
                  <td className={tdClassName}>{user.role}</td>
                  <td className={tdClassName}><StatusBadge status={user.active ? "ACTIVE" : "SUSPENDED"} /></td>
                  <td className={tdClassName}>{t("users.activity", { businesses: user._count.businesses, reviews: user._count.reviews })}</td>
                  <td className={tdClassName}>
                    <form action={updateUserAccess} className="grid gap-2 sm:grid-cols-[160px_120px_auto]">
                      <input type="hidden" name="userId" value={user.id} />
                      <select name="role" defaultValue={user.role} className={inputClassName}>
                        {roles.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                      <select name="active" defaultValue={String(user.active)} className={inputClassName}>
                        <option value="true">{t("common.active")}</option>
                        <option value="false">{t("common.inactive")}</option>
                      </select>
                      <AdminButton tone="success">{t("actions.save")}</AdminButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTable>
      </AdminSection>
    </div>
  );
}
