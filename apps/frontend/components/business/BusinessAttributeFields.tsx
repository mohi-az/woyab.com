"use client";

import { useLocale } from "next-intl";
import {
  businessAttributeFieldName,
  businessAttributeLabel,
  type BusinessAttributeDefinition,
  type BusinessAttributeValue,
} from "@/lib/business-attributes";

type Props = {
  definitions: BusinessAttributeDefinition[];
  values?: BusinessAttributeValue[];
  variant?: "admin" | "owner";
};

const adminInputClassName = "admin-input min-h-10 rounded-lg px-3 text-sm outline-none focus:border-sky-400";
const ownerInputClassName = "min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-primary";

function isEnabled(value?: string) {
  return value === "true" || value === "on" || value === "1";
}

export function BusinessAttributeFields({ definitions, values = [], variant = "owner" }: Props) {
  const locale = useLocale();
  const valueMap = new Map(values.map((item) => [item.attributeId, item.value]));
  const inputClassName = variant === "admin" ? adminInputClassName : ownerInputClassName;
  const checkboxClassName = variant === "admin"
    ? "h-4 w-4 rounded border-white/20 bg-transparent text-sky-400 focus:ring-sky-400"
    : "h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary";
  const itemClassName = variant === "admin"
    ? "flex min-h-12 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm font-bold text-white"
    : "flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700";

  if (!definitions.length) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {definitions.map((definition) => {
        const fieldName = businessAttributeFieldName(definition.id);
        const value = valueMap.get(definition.id);
        const label = businessAttributeLabel(definition, locale);

        if (definition.dataType === "BOOLEAN") {
          return (
            <label key={definition.id} className={itemClassName}>
              <input name={fieldName} type="checkbox" defaultChecked={isEnabled(value)} className={checkboxClassName} />
              <span>{label}</span>
            </label>
          );
        }

        return (
          <label key={definition.id} className="grid gap-2">
            <span className={variant === "admin" ? "admin-muted text-xs font-black" : "text-xs font-black text-slate-500"}>{label}</span>
            <input
              name={fieldName}
              type={definition.dataType === "NUMBER" ? "number" : "text"}
              defaultValue={value ?? ""}
              className={inputClassName}
            />
          </label>
        );
      })}
    </div>
  );
}
