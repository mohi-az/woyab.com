"use client";

import { useMemo, useState } from "react";
import { Button, ConfigProvider, Input, Segmented, Switch, Tag, Tooltip } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { FiClock, FiCopy, FiMinusCircle, FiPlusCircle } from "react-icons/fi";

export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export type BusinessHourValue = {
  dayOfWeek: DayOfWeek;
  openTime?: string | null;
  closeTime?: string | null;
  isClosed: boolean;
  note?: string | null;
};

type HourDraft = {
  enabled: boolean;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  note: string;
};

type Props = {
  defaultHours?: BusinessHourValue[];
  variant?: "admin" | "owner";
};

const days: Array<{ key: DayOfWeek; shortKey: string; labelKey: string }> = [
  { key: "MONDAY", shortKey: "shortDays.MONDAY", labelKey: "days.MONDAY" },
  { key: "TUESDAY", shortKey: "shortDays.TUESDAY", labelKey: "days.TUESDAY" },
  { key: "WEDNESDAY", shortKey: "shortDays.WEDNESDAY", labelKey: "days.WEDNESDAY" },
  { key: "THURSDAY", shortKey: "shortDays.THURSDAY", labelKey: "days.THURSDAY" },
  { key: "FRIDAY", shortKey: "shortDays.FRIDAY", labelKey: "days.FRIDAY" },
  { key: "SATURDAY", shortKey: "shortDays.SATURDAY", labelKey: "days.SATURDAY" },
  { key: "SUNDAY", shortKey: "shortDays.SUNDAY", labelKey: "days.SUNDAY" },
];

const presets = [
  { label: "09-17", value: "09:00|17:00" },
  { label: "10-18", value: "10:00|18:00" },
  { label: "24h", value: "00:00|23:59" },
];

const defaultDraft: HourDraft = {
  enabled: false,
  openTime: "09:00",
  closeTime: "17:00",
  isClosed: false,
  note: "",
};

function initialDrafts(defaultHours: BusinessHourValue[] = []) {
  const byDay = new Map(defaultHours.map((hour) => [hour.dayOfWeek, hour]));
  return Object.fromEntries(
    days.map(({ key }) => {
      const hour = byDay.get(key);
      return [key, {
        ...defaultDraft,
        enabled: Boolean(hour),
        openTime: hour?.openTime ?? defaultDraft.openTime,
        closeTime: hour?.closeTime ?? defaultDraft.closeTime,
        isClosed: hour?.isClosed ?? false,
        note: hour?.note ?? "",
      }];
    }),
  ) as Record<DayOfWeek, HourDraft>;
}

function nextDraft(current: HourDraft, patch: Partial<HourDraft>) {
  return { ...current, ...patch };
}

export function BusinessHoursEditor({ defaultHours = [], variant = "owner" }: Props) {
  const locale = useLocale();
  const t = useTranslations("BusinessHours");
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>("MONDAY");
  const [drafts, setDrafts] = useState<Record<DayOfWeek, HourDraft>>(() => initialDrafts(defaultHours));
  const activeCount = useMemo(() => Object.values(drafts).filter((draft) => draft.enabled).length, [drafts]);
  const selectedDraft = drafts[selectedDay];
  const isAdmin = variant === "admin";

  function updateDay(day: DayOfWeek, patch: Partial<HourDraft>) {
    setDrafts((current) => ({
      ...current,
      [day]: nextDraft(current[day], patch),
    }));
  }

  function applyPreset(value: string | number) {
    const [openTime, closeTime] = String(value).split("|");
    updateDay(selectedDay, { enabled: true, isClosed: false, openTime, closeTime });
  }

  function copySelectedToWeekdays() {
    setDrafts((current) => {
      const source = current[selectedDay];
      return {
        ...current,
        MONDAY: { ...source, enabled: true },
        TUESDAY: { ...source, enabled: true },
        WEDNESDAY: { ...source, enabled: true },
        THURSDAY: { ...source, enabled: true },
        FRIDAY: { ...source, enabled: true },
      };
    });
  }

  function copySelectedToAll() {
    setDrafts((current) => Object.fromEntries(days.map(({ key }) => [key, { ...current[selectedDay], enabled: true }])) as Record<DayOfWeek, HourDraft>);
  }

  return (
    <ConfigProvider direction={locale === "fa" ? "rtl" : "ltr"}>
      <div className={isAdmin ? "business-hours-editor business-hours-editor-admin" : "business-hours-editor"}>
        {days.map(({ key }) => {
          const draft = drafts[key];
          return (
            <div key={key} hidden>
              <input type="hidden" name={`hours_${key}_enabled`} value={draft.enabled ? "true" : "false"} />
              <input type="hidden" name={`hours_${key}_openTime`} value={draft.openTime} />
              <input type="hidden" name={`hours_${key}_closeTime`} value={draft.closeTime} />
              <input type="hidden" name={`hours_${key}_isClosed`} value={draft.isClosed ? "true" : "false"} />
              <input type="hidden" name={`hours_${key}_note`} value={draft.note} />
            </div>
          );
        })}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/12 text-sky-300">
                <FiClock />
              </span>
              <div>
                <h3 className={isAdmin ? "text-base font-black text-white" : "text-lg font-black text-slate-950"}>{t("title")}</h3>
                <p className={isAdmin ? "text-xs font-bold text-slate-400" : "text-xs font-bold text-slate-500"}>{t("configuredDays", { count: activeCount })}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Tooltip title={t("copyWeekdaysTooltip")}>
              <Button icon={<FiCopy />} onClick={copySelectedToWeekdays}>{t("weekdays")}</Button>
            </Tooltip>
            <Tooltip title={t("copyAllTooltip")}>
              <Button icon={<FiCopy />} onClick={copySelectedToAll}>{t("allDays")}</Button>
            </Tooltip>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr]">
          <div className="grid gap-2">
            {days.map(({ key, shortKey, labelKey }) => {
              const draft = drafts[key];
              const active = selectedDay === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(key)}
                  className={`business-hours-day ${active ? "business-hours-day-active" : ""}`}
                >
                  <span>
                    <strong>{t(shortKey)}</strong>
                    <small>{t(labelKey)}</small>
                  </span>
                  {draft.enabled ? (
                    <Tag color={draft.isClosed ? "red" : "green"}>{draft.isClosed ? t("closed") : t("open")}</Tag>
                  ) : (
                    <Tag>{t("unset")}</Tag>
                  )}
                </button>
              );
            })}
          </div>

          <div className="business-hours-panel rounded-lg border p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className={isAdmin ? "text-xs font-black uppercase text-sky-200" : "text-xs font-black uppercase text-primary"}>{t(days.find((day) => day.key === selectedDay)?.labelKey ?? "days.MONDAY")}</p>
                <h4 className={isAdmin ? "mt-1 text-xl font-black text-white" : "mt-1 text-xl font-black text-slate-950"}>{t("settingsTitle")}</h4>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className={isAdmin ? "text-sm font-bold text-slate-300" : "text-sm font-bold text-slate-700"}>{t("showOnProfile")}</span>
                <Switch
                  checked={selectedDraft.enabled}
                  checkedChildren={<FiPlusCircle />}
                  unCheckedChildren={<FiMinusCircle />}
                  onChange={(enabled) => updateDay(selectedDay, { enabled })}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_auto]">
              <Segmented
                block
                value={selectedDraft.isClosed ? "closed" : "open"}
                options={[
                  { label: t("open"), value: "open" },
                  { label: t("closed"), value: "closed" },
                ]}
                onChange={(value) => updateDay(selectedDay, value === "closed"
                  ? { enabled: true, isClosed: true, openTime: "", closeTime: "", note: "" }
                  : { enabled: true, isClosed: false, openTime: selectedDraft.openTime || "09:00", closeTime: selectedDraft.closeTime || "17:00" })}
              />
              {!selectedDraft.isClosed ? <Segmented options={presets} onChange={applyPreset} /> : null}
            </div>

            {!selectedDraft.isClosed ? <>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold">
                <span className={isAdmin ? "text-slate-300" : "text-slate-700"}>{t("opens")}</span>
                <Input
                  type="time"
                  value={selectedDraft.openTime}
                  disabled={!selectedDraft.enabled || selectedDraft.isClosed}
                  onChange={(event) => updateDay(selectedDay, { openTime: event.target.value })}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                <span className={isAdmin ? "text-slate-300" : "text-slate-700"}>{t("closes")}</span>
                <Input
                  type="time"
                  value={selectedDraft.closeTime}
                  disabled={!selectedDraft.enabled || selectedDraft.isClosed}
                  onChange={(event) => updateDay(selectedDay, { closeTime: event.target.value })}
                />
              </label>
            </div>

            <label className="mt-4 grid gap-2 text-sm font-bold">
              <span className={isAdmin ? "text-slate-300" : "text-slate-700"}>{t("note")}</span>
              <Input
                value={selectedDraft.note}
                placeholder={t("notePlaceholder")}
                disabled={!selectedDraft.enabled}
                onChange={(event) => updateDay(selectedDay, { note: event.target.value })}
              />
            </label>
            </> : null}
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}
