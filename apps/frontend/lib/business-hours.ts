export type BusinessDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type BusinessHour = {
  dayOfWeek: BusinessDay;
  openTime?: string | null;
  closeTime?: string | null;
  isClosed: boolean;
};

export type BusinessOpenStatus = {
  kind: "OPEN" | "OPEN_SOON" | "CLOSE_SOON" | "CLOSED" | "UNKNOWN";
  transitionTime?: string;
  minutesUntilTransition?: number;
};

const DAYS: BusinessDay[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const weekdayMap: Record<string, BusinessDay> = {
  Monday: "MONDAY",
  Tuesday: "TUESDAY",
  Wednesday: "WEDNESDAY",
  Thursday: "THURSDAY",
  Friday: "FRIDAY",
  Saturday: "SATURDAY",
  Sunday: "SUNDAY",
};

function timeMinutes(value?: string | null) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function germanyBusinessClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  const day = weekdayMap[part("weekday") ?? ""] ?? "MONDAY";
  const hour = Number(part("hour") ?? 0);
  const minute = Number(part("minute") ?? 0);
  return { day, minutes: hour * 60 + minute };
}

export function getBusinessOpenStatus(
  hours: BusinessHour[],
  now = new Date(),
): BusinessOpenStatus {
  if (!hours.length) return { kind: "UNKNOWN" };

  const clock = germanyBusinessClock(now);
  const todayIndex = DAYS.indexOf(clock.day);
  const previousDay = DAYS[(todayIndex + 6) % 7];
  const today = hours.find((hour) => hour.dayOfWeek === clock.day);
  const previous = hours.find((hour) => hour.dayOfWeek === previousDay);

  const currentIntervals = [
    today ? { hour: today, previousDay: false } : null,
    previous ? { hour: previous, previousDay: true } : null,
  ].filter((entry): entry is { hour: BusinessHour; previousDay: boolean } => Boolean(entry));

  for (const { hour, previousDay: fromPreviousDay } of currentIntervals) {
    if (hour.isClosed) continue;
    const open = timeMinutes(hour.openTime);
    const close = timeMinutes(hour.closeTime);
    if (open === null || close === null) continue;

    let minutesUntilClose: number | null = null;
    if (open === close && !fromPreviousDay) {
      minutesUntilClose = 24 * 60;
    } else if (!fromPreviousDay && open < close && clock.minutes >= open && clock.minutes < close) {
      minutesUntilClose = close - clock.minutes;
    } else if (!fromPreviousDay && open > close && clock.minutes >= open) {
      minutesUntilClose = 24 * 60 - clock.minutes + close;
    } else if (fromPreviousDay && open > close && clock.minutes < close) {
      minutesUntilClose = close - clock.minutes;
    }

    if (minutesUntilClose !== null) {
      return minutesUntilClose <= 60
        ? { kind: "CLOSE_SOON", transitionTime: hour.closeTime ?? undefined, minutesUntilTransition: minutesUntilClose }
        : { kind: "OPEN", transitionTime: hour.closeTime ?? undefined, minutesUntilTransition: minutesUntilClose };
    }
  }

  let nextOpening: { minutes: number; time: string } | null = null;
  for (let offset = 0; offset <= 7; offset += 1) {
    const day = DAYS[(todayIndex + offset) % 7];
    const hour = hours.find((entry) => entry.dayOfWeek === day);
    if (!hour || hour.isClosed) continue;
    const open = timeMinutes(hour.openTime);
    const close = timeMinutes(hour.closeTime);
    if (open === null || close === null) continue;
    const minutes = offset * 24 * 60 + open - clock.minutes;
    if (minutes <= 0) continue;
    if (!nextOpening || minutes < nextOpening.minutes) {
      nextOpening = { minutes, time: hour.openTime as string };
    }
  }

  return nextOpening && nextOpening.minutes <= 60
    ? { kind: "OPEN_SOON", transitionTime: nextOpening.time, minutesUntilTransition: nextOpening.minutes }
    : { kind: "CLOSED" };
}
