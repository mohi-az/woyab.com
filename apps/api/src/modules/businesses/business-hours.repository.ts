import { Prisma } from "@woyab/database";
import { prisma } from "../../lib/prisma.js";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

const weekdayMap: Record<string, (typeof DAYS)[number]> = {
  Monday: "MONDAY",
  Tuesday: "TUESDAY",
  Wednesday: "WEDNESDAY",
  Thursday: "THURSDAY",
  Friday: "FRIDAY",
  Saturday: "SATURDAY",
  Sunday: "SUNDAY",
};

function currentGermanBusinessTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  const today = weekdayMap[part("weekday") ?? ""] ?? "MONDAY";
  const todayIndex = DAYS.indexOf(today);
  return {
    today,
    previousDay: DAYS[(todayIndex + 6) % 7],
    time: `${part("hour") ?? "00"}:${part("minute") ?? "00"}`,
  };
}

export function currentlyOpenBusinessCondition() {
  const { today, previousDay, time } = currentGermanBusinessTime();
  return Prisma.sql`EXISTS (
    SELECT 1
    FROM "business_hours" bh_open
    WHERE bh_open."businessId" = b."id"
      AND bh_open."isClosed" = FALSE
      AND bh_open."openTime" IS NOT NULL
      AND bh_open."closeTime" IS NOT NULL
      AND (
        (
          bh_open."dayOfWeek" = ${today}::"day_of_week"
          AND (
            (bh_open."openTime" = bh_open."closeTime")
            OR (
              bh_open."openTime" < bh_open."closeTime"
              AND bh_open."openTime" <= ${time}
              AND bh_open."closeTime" > ${time}
            )
            OR (
              bh_open."openTime" > bh_open."closeTime"
              AND bh_open."openTime" <= ${time}
            )
          )
        )
        OR (
          bh_open."dayOfWeek" = ${previousDay}::"day_of_week"
          AND bh_open."openTime" > bh_open."closeTime"
          AND bh_open."closeTime" > ${time}
        )
      )
  )`;
}

export async function findCurrentlyOpenBusinessIds() {
  const condition = currentlyOpenBusinessCondition();
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT b."id"
    FROM "businesses" b
    WHERE b."status" = 'ACTIVE'::"business_status"
      AND b."verified" = TRUE
      AND b."removedAt" IS NULL
      AND ${condition}
  `);
  return rows.map((row) => row.id);
}
