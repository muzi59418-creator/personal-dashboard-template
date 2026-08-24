import type { DiaryEntry } from "../types/dashboard";
import { todayInputValue } from "./date";

export const RECENT_DIARY_DAY_COUNT = 3;

export function getRecentDiaryEntries(entries: DiaryEntry[], today = todayInputValue()): DiaryEntry[] {
  const startDate = offsetIsoDate(today, -(RECENT_DIARY_DAY_COUNT - 1));

  return [...entries]
    .filter((entry) => entry.date >= startDate && entry.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.updatedAt || "").localeCompare(a.updatedAt || "") || a.id.localeCompare(b.id));
}

function offsetIsoDate(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  date.setDate(date.getDate() + days);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
