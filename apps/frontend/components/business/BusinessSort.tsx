"use client";

import { FiBarChart2, FiChevronDown } from "react-icons/fi";

export type BusinessSortValue = "latest" | "oldest" | "popular";

type Props = {
  value: BusinessSortValue;
  label: string;
  latestLabel: string;
  oldestLabel: string;
  popularLabel: string;
  onChange: (value: BusinessSortValue) => void;
};

export function BusinessSort({
  value,
  label,
  latestLabel,
  oldestLabel,
  popularLabel,
  onChange,
}: Props) {
  return (
    <label className="relative inline-flex h-11 min-w-44 items-center rounded-full border border-slate-300 bg-white text-sm font-bold text-slate-800 transition hover:border-primary hover:text-primary focus-within:border-primary focus-within:text-primary focus-within:ring-4 focus-within:ring-primary/15">
      <span className="sr-only">{label}</span>
      <FiBarChart2 aria-hidden="true" className="pointer-events-none absolute start-4 text-base text-primary" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as BusinessSortValue)}
        aria-label={label}
        className="h-full w-full cursor-pointer appearance-none rounded-full bg-transparent ps-11 pe-10 font-bold outline-none"
      >
        <option value="latest">{latestLabel}</option>
        <option value="oldest">{oldestLabel}</option>
        <option value="popular">{popularLabel}</option>
      </select>
      <FiChevronDown aria-hidden="true" className="pointer-events-none absolute end-4 text-sm text-slate-500" />
    </label>
  );
}
