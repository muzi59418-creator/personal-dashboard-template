export interface ChinaWorkCalendarYear {
  year: number;
  source: string;
  publicHolidays: string[];
  adjustedWorkdays: string[];
}

export interface ChinaWorkdayCheck {
  ok: boolean;
  isWorkingDay: boolean;
  reason: "adjusted_workday" | "public_holiday" | "weekday" | "weekend" | "missing_calendar" | "invalid_date";
  message?: string;
}

export const CHINA_WORK_CALENDARS: Record<number, ChinaWorkCalendarYear> = {
  2026: {
    year: 2026,
    source:
      "国务院办公厅《国务院办公厅关于2026年部分节假日安排的通知》（国办发明电〔2025〕7号），中国政府网/国务院公报发布。",
    publicHolidays: [
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-02-15",
      "2026-02-16",
      "2026-02-17",
      "2026-02-18",
      "2026-02-19",
      "2026-02-20",
      "2026-02-21",
      "2026-02-22",
      "2026-02-23",
      "2026-04-04",
      "2026-04-05",
      "2026-04-06",
      "2026-05-01",
      "2026-05-02",
      "2026-05-03",
      "2026-05-04",
      "2026-05-05",
      "2026-06-19",
      "2026-06-20",
      "2026-06-21",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
    ],
    adjustedWorkdays: ["2026-01-04", "2026-02-14", "2026-02-28", "2026-05-09", "2026-09-20", "2026-10-10"],
  },
};

export function hasChinaWorkCalendar(date: string): boolean {
  const parts = parseIsoDate(date);
  return Boolean(parts && CHINA_WORK_CALENDARS[parts.year]);
}

export function isPublicHoliday(date: string): boolean {
  const parts = parseIsoDate(date);
  if (!parts) return false;
  const calendar = CHINA_WORK_CALENDARS[parts.year];
  return Boolean(calendar?.publicHolidays.includes(date));
}

export function isAdjustedWorkday(date: string): boolean {
  const parts = parseIsoDate(date);
  if (!parts) return false;
  const calendar = CHINA_WORK_CALENDARS[parts.year];
  return Boolean(calendar?.adjustedWorkdays.includes(date));
}

export function getChinaWorkdayCheck(date: string): ChinaWorkdayCheck {
  const parts = parseIsoDate(date);
  if (!parts) {
    return { ok: false, isWorkingDay: false, reason: "invalid_date", message: `日期 ${date || "空"} 格式不正确。` };
  }

  const calendar = CHINA_WORK_CALENDARS[parts.year];
  if (!calendar) {
    return {
      ok: false,
      isWorkingDay: false,
      reason: "missing_calendar",
      message: `${parts.year} 年中国法定工作日历尚未配置，已停止需要法定工作日判断的自动生成。`,
    };
  }

  if (calendar.adjustedWorkdays.includes(date)) return { ok: true, isWorkingDay: true, reason: "adjusted_workday" };
  if (calendar.publicHolidays.includes(date)) return { ok: true, isWorkingDay: false, reason: "public_holiday" };
  const weekday = getIsoWeekday(date);
  if (weekday >= 1 && weekday <= 5) return { ok: true, isWorkingDay: true, reason: "weekday" };
  return { ok: true, isWorkingDay: false, reason: "weekend" };
}

export function isChinaWorkingDay(date: string): boolean {
  const check = getChinaWorkdayCheck(date);
  return check.ok && check.isWorkingDay;
}

export function getNextChinaWorkingDay(date: string): string {
  let cursor = addDays(date, 1);
  for (let index = 0; index < 370; index += 1) {
    const check = getChinaWorkdayCheck(cursor);
    if (!check.ok) throw new Error(check.message || "中国法定工作日历缺失。");
    if (check.isWorkingDay) return cursor;
    cursor = addDays(cursor, 1);
  }
  throw new Error("未能在年度配置范围内找到下一个中国法定工作日。");
}

export function addDays(date: string, amount: number): string {
  const parts = parseIsoDate(date);
  if (!parts) return "";
  const value = new Date(parts.year, parts.month - 1, parts.day);
  value.setDate(value.getDate() + amount);
  return formatIsoDate(value);
}

export function getIsoWeekday(date: string): number {
  const parts = parseIsoDate(date);
  if (!parts) return 0;
  const day = new Date(parts.year, parts.month - 1, parts.day).getDay();
  return day === 0 ? 7 : day;
}

export function parseIsoDate(date: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > new Date(year, month, 0).getDate()) return null;
  return { year, month, day };
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
