"use client";

type Props = {
  value?: "latest" | "distance";
  locationActive: boolean;
  label: string;
  recommendedLabel: string;
  latestLabel: string;
  nearestLabel: string;
  onChange: (value: "recommended" | "latest" | "distance") => void;
};

export function BusinessSort({
  value,
  locationActive,
  label,
  recommendedLabel,
  latestLabel,
  nearestLabel,
  onChange,
}: Props) {
  return (
    <label className="flex items-center gap-3 text-sm font-semibold text-gray-700 sm:text-base">
      <span className="whitespace-nowrap">{label}</span>
      <select
        value={value ?? "recommended"}
        onChange={(event) => onChange(event.target.value as "recommended" | "latest" | "distance")}
        className="h-11 min-w-44 rounded-xl border border-gray-200 bg-[#f8f7f6] px-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 sm:min-w-52"
      >
        <option value="recommended">{recommendedLabel}</option>
        <option value="latest">{latestLabel}</option>
        {locationActive ? <option value="distance">{nearestLabel}</option> : null}
      </select>
    </label>
  );
}
