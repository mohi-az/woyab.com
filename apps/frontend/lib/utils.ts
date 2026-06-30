import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ادغام کلاس‌های Tailwind بدون تداخل
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
