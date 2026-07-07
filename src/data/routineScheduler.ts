import type { RoutineWorkTemplate, WorkItem } from "../types/dashboard";
import {
  addDays,
  getChinaWorkdayCheck,
  getIsoWeekday,
  getNextChinaWorkingDay,
  isPublicHoliday,
  parseIsoDate,
} from "./chinaWorkCalendar";

export interface RoutineTrigger {
  ruleId: string;
  originalDate: string;
  actualDate: string;
  holidayPostponed: boolean;
}

export interface RoutineGenerationPlan {
  triggers: RoutineTrigger[];
  warnings: string[];
}

export function createRoutineGenerationPlan(templates: RoutineWorkTemplate[], targetDate: string): RoutineGenerationPlan {
  const warnings = new Set<string>();
  const triggers: RoutineTrigger[] = [];
  const targetCheck = getChinaWorkdayCheck(targetDate);
  if (!targetCheck.ok) {
    warnings.add(targetCheck.message || "中国法定工作日历缺失。");
    return { triggers: [], warnings: Array.from(warnings) };
  }

  const postponedOriginalDates = getPublicHolidayDatesPostponedTo(targetDate, warnings);

  templates.forEach((template) => {
    const activeTemplate = getAutoRecoveredTemplate(template, targetDate);
    if (!canRuleRunOnDate(activeTemplate, targetDate)) return;

    const targetTrigger = getTriggerForOriginalDate(activeTemplate, targetDate, targetDate, warnings);
    if (targetTrigger) triggers.push(targetTrigger);

    const postponed = postponedOriginalDates
      .filter((originalDate) => canRuleRunOnDate(activeTemplate, originalDate))
      .map((originalDate) => getTriggerForOriginalDate(activeTemplate, originalDate, targetDate, warnings))
      .filter((trigger): trigger is RoutineTrigger => Boolean(trigger));

    if (postponed.length > 0) {
      const [first] = postponed.sort((a, b) => a.originalDate.localeCompare(b.originalDate));
      triggers.push(first);
    }
  });

  return { triggers: mergeTriggers(triggers), warnings: Array.from(warnings) };
}

export function getAutoRecoveredTemplate(template: RoutineWorkTemplate, targetDate: string): RoutineWorkTemplate {
  if (!template.paused || !template.pausedUntil || targetDate < template.pausedUntil) return template;
  return { ...template, paused: false, pausedUntil: "", pauseResumeMode: "manual" };
}

export function isRoutineItem(item: WorkItem): boolean {
  return item.sourceTemplateType === "routine" || Boolean(item.sourceTemplateId && item.sourceTemplateType !== "work");
}

export function isOpenRoutineItem(item: WorkItem): boolean {
  return isRoutineItem(item) && item.status !== "已完成" && item.status !== "已跳过" && !item.routineSkipped;
}

export function getRoutineRuleIdFromItem(item: WorkItem): string {
  return item.routineRuleId || item.sourceTemplateId || "";
}

export function mergeRoutineTrace(target: WorkItem, incoming: Pick<WorkItem, "routineOriginalDate" | "routineHolidayPostponed" | "routineManualPostponed">): WorkItem {
  const dates = new Set<string>(target.routineMergedTriggerDates || []);
  if (target.routineOriginalDate) dates.add(target.routineOriginalDate);
  if (incoming.routineOriginalDate) dates.add(incoming.routineOriginalDate);
  return {
    ...target,
    routineMerged: dates.size > 1 || target.routineMerged,
    routineHolidayPostponed: Boolean(target.routineHolidayPostponed || incoming.routineHolidayPostponed),
    routineManualPostponed: Boolean(target.routineManualPostponed || incoming.routineManualPostponed),
    routineMergedTriggerDates: Array.from(dates).sort(),
  };
}

function getTriggerForOriginalDate(
  template: RoutineWorkTemplate,
  originalDate: string,
  targetDate: string,
  warnings: Set<string>,
): RoutineTrigger | null {
  if (!matchesFrequency(template, originalDate, warnings)) return null;

  const actualDate = getActualDate(template, originalDate, warnings);
  if (!actualDate || actualDate !== targetDate) return null;
  return {
    ruleId: template.id,
    originalDate,
    actualDate,
    holidayPostponed: actualDate !== originalDate,
  };
}

function getActualDate(template: RoutineWorkTemplate, originalDate: string, warnings: Set<string>): string {
  if (template.frequency === "workday") {
    const check = getChinaWorkdayCheck(originalDate);
    if (!check.ok) {
      warnings.add(check.message || "中国法定工作日历缺失。");
      return "";
    }
    return check.isWorkingDay ? originalDate : getNextWorkingDaySafely(originalDate, warnings);
  }

  if (template.frequency === "daily") {
    if (template.dailyHolidayPolicy === "postpone" && isPublicHoliday(originalDate)) {
      return getNextWorkingDaySafely(originalDate, warnings);
    }
    return originalDate;
  }

  if (isPublicHoliday(originalDate)) {
    return getNextWorkingDaySafely(originalDate, warnings);
  }
  return originalDate;
}

function getNextWorkingDaySafely(originalDate: string, warnings: Set<string>): string {
  try {
    return getNextChinaWorkingDay(originalDate);
  } catch (error) {
    warnings.add(error instanceof Error ? error.message : "中国法定工作日历缺失。");
    return "";
  }
}

function matchesFrequency(template: RoutineWorkTemplate, date: string, warnings: Set<string>): boolean {
  const parts = parseIsoDate(date);
  if (!parts) return false;
  if (template.frequency === "daily") return true;
  if (template.frequency === "workday") {
    const check = getChinaWorkdayCheck(date);
    if (!check.ok) {
      warnings.add(check.message || "中国法定工作日历缺失。");
      return false;
    }
    return check.isWorkingDay || check.reason === "public_holiday";
  }
  if (template.frequency === "weekly") return template.weekdays.includes(getIsoWeekday(date));
  if (template.frequency === "monthly") {
    if (!template.monthlyDay) return false;
    return parts.day === Math.min(template.monthlyDay, new Date(parts.year, parts.month, 0).getDate());
  }
  if (template.frequency === "custom") return template.customDate === date;
  return false;
}

function canRuleRunOnDate(template: RoutineWorkTemplate, originalDate: string): boolean {
  if (!template.enabled || template.paused) return false;
  if (template.effectiveDate && originalDate < template.effectiveDate) return false;
  if (template.endDate && originalDate > template.endDate) return false;
  return true;
}

function getPublicHolidayDatesPostponedTo(targetDate: string, warnings: Set<string>): string[] {
  const dates: string[] = [];
  let cursor = addDays(targetDate, -1);
  for (let index = 0; index < 21 && cursor; index += 1) {
    if (isPublicHoliday(cursor)) {
      const next = getNextWorkingDaySafely(cursor, warnings);
      if (next === targetDate) dates.push(cursor);
    }
    cursor = addDays(cursor, -1);
  }
  return dates;
}

function mergeTriggers(triggers: RoutineTrigger[]): RoutineTrigger[] {
  const byRuleAndDate = new Map<string, RoutineTrigger>();
  triggers.forEach((trigger) => {
    const key = `${trigger.ruleId}:${trigger.actualDate}`;
    const existing = byRuleAndDate.get(key);
    if (!existing || trigger.originalDate < existing.originalDate) {
      byRuleAndDate.set(key, {
        ...trigger,
        holidayPostponed: Boolean(trigger.holidayPostponed || existing?.holidayPostponed),
      });
    } else if (existing) {
      byRuleAndDate.set(key, { ...existing, holidayPostponed: Boolean(existing.holidayPostponed || trigger.holidayPostponed) });
    }
  });
  return Array.from(byRuleAndDate.values()).sort((a, b) => a.ruleId.localeCompare(b.ruleId) || a.actualDate.localeCompare(b.actualDate));
}
