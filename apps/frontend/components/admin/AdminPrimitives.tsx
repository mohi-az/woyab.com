import type { IconType } from "react-icons";
import { cn } from "@/lib/utils";

export function AdminSection({ title, description, children, action }: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-section rounded-lg border shadow-xl">
      <div className="admin-section-header flex flex-wrap items-start justify-between gap-4 border-b px-5 py-4">
        <div>
          <h2 className="admin-title text-xl font-black">{title}</h2>
          {description ? <p className="admin-muted mt-1 text-sm leading-6">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, icon: Icon, tone = "blue" }: {
  label: string;
  value: string | number;
  icon: IconType;
  tone?: "blue" | "green" | "purple" | "orange" | "rose" | "cyan";
}) {
  const tones = {
    blue: "from-blue-500 to-blue-600",
    green: "from-emerald-500 to-green-500",
    purple: "from-violet-500 to-indigo-500",
    orange: "from-amber-400 to-orange-500",
    rose: "from-rose-500 to-pink-500",
    cyan: "from-sky-400 to-cyan-500",
  };

  return (
    <div className={cn("grid min-h-[118px] grid-cols-[auto_1fr] items-center gap-5 rounded-lg bg-gradient-to-r p-6 text-white shadow-xl", tones[tone])}>
      <span className="grid h-14 w-14 place-items-center rounded-lg bg-white/12">
        <Icon className="h-7 w-7" />
      </span>
      <div>
        <p className="text-sm font-bold text-white/85">{label}</p>
        <strong className="mt-2 block text-3xl font-black">{value}</strong>
      </div>
    </div>
  );
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span data-status={status} className="admin-status-badge inline-flex min-h-6 items-center rounded-full px-2.5 text-[11px] font-black uppercase ring-1">
      {label || status}
    </span>
  );
}

export function AdminTable({ children }: { children: React.ReactNode }) {
  return <div className="admin-table-wrap overflow-x-auto rounded-lg border">{children}</div>;
}

export const tableClassName = "admin-table min-w-full divide-y text-sm";
export const thClassName = "admin-th whitespace-nowrap px-4 py-2.5 text-start text-xs font-black uppercase tracking-wide";
export const tdClassName = "admin-td align-middle px-4 py-2.5";

export function AdminButton({ children, tone = "default", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "default" | "danger" | "success" }) {
  return <button {...props} data-tone={tone} className={cn("admin-button inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-black", props.className)}>{children}</button>;
}
