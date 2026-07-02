export function todayInputValue(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(value: string): string {
  if (!value) return "未设置日期";
  const [year, month, day] = value.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

export function formatDateTime(value: string): string {
  if (!value) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatWeekday(value: string): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(new Date(`${value}T00:00:00`));
}

export function sortByDateDesc<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date));
}

export function isSameDate(value: string, target = todayInputValue()): boolean {
  return value === target;
}

export function isIsoDateInCurrentWeek(value: string): boolean {
  if (!value) return false;
  const target = new Date(`${value}T00:00:00`);
  const today = new Date();
  const todayDay = today.getDay() === 0 ? 7 : today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - todayDay + 1);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return target >= monday && target <= sunday;
}
