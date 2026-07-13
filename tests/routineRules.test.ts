import assert from "node:assert/strict";
import { CHINA_WORK_CALENDARS, getChinaWorkdayCheck, isPublicHoliday } from "../src/data/chinaWorkCalendar";
import { createRoutineGenerationPlan } from "../src/data/routineScheduler";
import {
  deleteRoutineWorkTemplate,
  exportData,
  importData,
  pauseRoutineWorkTemplate,
  postponeRoutineWorkItem,
  resumeRoutineWorkTemplate,
  skipRoutineWorkItem,
  syncRoutineWorkForDate,
  updateRoutineWorkTemplateWithMode,
} from "../src/data/repository";
import { readDashboard, replaceDashboard, STORAGE_KEY } from "../src/data/storage";
import type { DashboardData, RoutineWorkTemplate, WorkItem } from "../src/types/dashboard";

class LocalStorageMock {
  store = new Map<string, string>();
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

Object.defineProperty(globalThis, "localStorage", { value: new LocalStorageMock(), configurable: true });
Object.defineProperty(globalThis, "crypto", { value: { randomUUID: () => `id_${Math.random().toString(16).slice(2)}` }, configurable: true });

const baseRule: RoutineWorkTemplate = {
  id: "rule_a",
  name: "规则 A",
  description: "说明",
  categoryId: "cat",
  projectId: "",
  frequency: "workday",
  weekdays: [],
  monthlyDay: null,
  customDate: "",
  defaultStatus: "待处理",
  enabled: true,
  effectiveDate: "",
  endDate: "",
  paused: false,
  pausedUntil: "",
  pauseResumeMode: "manual",
  resumeStrategy: "resume_today",
  pendingTaskPolicy: "keep",
  dailyHolidayPolicy: "generate",
  source: "test",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function rule(input: Partial<RoutineWorkTemplate>): RoutineWorkTemplate {
  return { ...baseRule, ...input };
}

function seedData(rules: RoutineWorkTemplate[], workItems: WorkItem[] = []): DashboardData {
  return {
    version: "1.3.0",
    appVersion: "1.4.3",
    schemaVersion: "1.3.0",
    updatedAt: "2026-01-01T00:00:00.000Z",
    migrations: [],
    diaryEntries: [],
    workItems,
    ideas: [],
    categories: [{ id: "cat", name: "分类", color: "#2563eb", sortOrder: 10, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }],
    projects: [],
    workResponsibilities: [],
    routineWorkTemplates: rules,
    workTemplates: [],
  };
}

function reset(rules: RoutineWorkTemplate[], workItems: WorkItem[] = []) {
  localStorage.clear();
  replaceDashboard(seedData(rules, workItems));
}

function assertOneCreated(date: string) {
  const result = syncRoutineWorkForDate(date);
  assert.equal(result.created.length, 1);
  return result.created[0];
}

assert.equal(getChinaWorkdayCheck("2026-01-04").isWorkingDay, true, "2026 调休上班日应识别为工作日");
assert.equal(getChinaWorkdayCheck("2026-02-14").reason, "adjusted_workday");
assert.equal(isPublicHoliday("2026-10-01"), true, "2026 法定节假日应识别");
assert.equal(CHINA_WORK_CALENDARS[2026].source.includes("国务院办公厅"), true);

const workdayPlan = createRoutineGenerationPlan([rule({ frequency: "workday" })], "2026-01-04");
assert.equal(workdayPlan.triggers.length, 1, "工作日频率连续假期后只补一次且与同日正常触发合并");
assert.equal(workdayPlan.triggers[0].holidayPostponed, true);

const dailyGenerate = createRoutineGenerationPlan([rule({ frequency: "daily", dailyHolidayPolicy: "generate" })], "2026-01-01");
assert.equal(dailyGenerate.triggers.length, 1, "每天假期仍生成");
assert.equal(dailyGenerate.triggers[0].actualDate, "2026-01-01");

const dailyPostpone = createRoutineGenerationPlan([rule({ frequency: "daily", dailyHolidayPolicy: "postpone" })], "2026-01-04");
assert.equal(dailyPostpone.triggers.length, 1, "每天假期顺延连续假期只补一次");
assert.equal(dailyPostpone.triggers[0].originalDate, "2026-01-01");

assert.equal(createRoutineGenerationPlan([rule({ frequency: "weekly", weekdays: [4] })], "2026-01-04").triggers.length, 1, "每周遇节假日顺延");
assert.equal(createRoutineGenerationPlan([rule({ frequency: "monthly", monthlyDay: 1 })], "2026-01-04").triggers.length, 1, "每月遇节假日顺延");
assert.equal(createRoutineGenerationPlan([rule({ frequency: "custom", customDate: "2026-01-01" })], "2026-01-04").triggers.length, 1, "自定义遇节假日顺延");
assert.equal(createRoutineGenerationPlan([rule({ frequency: "weekly", weekdays: [6] })], "2026-01-10").triggers.length, 1, "普通周末不是法定节假日时维持原规则");

const twoRules = createRoutineGenerationPlan([rule({ id: "rule_a", frequency: "daily" }), rule({ id: "rule_b", frequency: "daily" })], "2026-01-05");
assert.equal(twoRules.triggers.length, 2, "不同规则同日不合并");

reset([rule({ frequency: "daily" })]);
assertOneCreated("2026-01-05");
assert.equal(syncRoutineWorkForDate("2026-01-05").created.length, 0, "同一规则同日重复会合并/去重");

const current = readDashboard().workItems[0];
postponeRoutineWorkItem(current.id, "2026-01-06");
assert.equal(readDashboard().workItems[0].date, "2026-01-06", "手动顺延到普通日期");
postponeRoutineWorkItem(current.id, "2026-01-10");
assert.equal(readDashboard().workItems[0].date, "2026-01-10", "手动顺延到周末后不再次自动改期");

reset([rule({ frequency: "daily" })]);
const skipped = assertOneCreated("2026-01-05");
skipRoutineWorkItem(skipped.id, "临时不做");
assert.equal(syncRoutineWorkForDate("2026-01-05").created.length, 0, "本次跳过保留记录且不再重复生成");
assert.equal(readDashboard().workItems[0].status, "已跳过");

reset([rule({ frequency: "daily" })]);
pauseRoutineWorkTemplate("rule_a", "keep", "2026-01-06", "resume_today");
assert.equal(syncRoutineWorkForDate("2026-01-05").created.length, 0, "暂停期间不生成");
assertOneCreated("2026-01-06");
resumeRoutineWorkTemplate("rule_a", "next_due");
assert.equal(readDashboard().routineWorkTemplates[0].paused, false, "支持手动恢复");

reset([rule({ frequency: "daily" })]);
const beforeEdit = assertOneCreated("2026-01-05");
updateRoutineWorkTemplateWithMode("rule_a", rule({ name: "新规则名", frequency: "daily" }), "future");
assert.equal(readDashboard().workItems.find((item) => item.id === beforeEdit.id)?.title, "规则 A", "编辑规则只更新未来");
updateRoutineWorkTemplateWithMode("rule_a", rule({ name: "同步规则名", frequency: "daily" }), "sync_open");
assert.equal(readDashboard().workItems.find((item) => item.id === beforeEdit.id)?.title, "同步规则名", "编辑规则同步未完成任务");

reset([rule({ frequency: "daily" })]);
assertOneCreated("2026-01-05");
deleteRoutineWorkTemplate("rule_a", "keep");
assert.equal(readDashboard().workItems[0].sourceTemplateId, undefined, "删除规则可保留为普通待办");
reset([rule({ frequency: "daily" })]);
assertOneCreated("2026-01-05");
deleteRoutineWorkTemplate("rule_a", "skip");
assert.equal(readDashboard().workItems[0].status, "已跳过", "删除规则可标记未完成任务为已跳过");
reset([rule({ frequency: "daily" })]);
assertOneCreated("2026-01-05");
deleteRoutineWorkTemplate("rule_a", "delete");
assert.equal(readDashboard().workItems.length, 0, "删除规则可删除未完成任务");

assert.equal(createRoutineGenerationPlan([rule({ frequency: "daily", effectiveDate: "2026-01-06" })], "2026-01-05").triggers.length, 0, "生效日期边界");
assert.equal(createRoutineGenerationPlan([rule({ frequency: "daily", endDate: "2026-01-04" })], "2026-01-05").triggers.length, 0, "结束日期边界");

localStorage.clear();
localStorage.setItem(
  STORAGE_KEY,
  JSON.stringify({
    version: "1.0.0",
    updatedAt: "2026-01-01T00:00:00.000Z",
    diaryEntries: [],
    workItems: [{ id: "old_work", title: "旧任务", categoryId: "cat", status: "待处理", content: "保留", date: "2026-01-05", projectId: "", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }],
    ideas: [],
    categories: [],
    projects: [],
    routineWorkTemplates: [{ id: "old_rule", name: "旧规则", frequency: "manual", defaultStatus: "待处理", enabled: true }],
  }),
);
const migrated = readDashboard();
assert.equal(migrated.appVersion, "1.4.3", "旧数据迁移补 appVersion");
assert.equal(migrated.schemaVersion, "1.3.0", "旧数据迁移补 schemaVersion");
assert.equal(migrated.workItems[0].title, "旧任务", "旧数据迁移不丢失工作记录");
assert.equal(migrated.routineWorkTemplates[0].frequency, "custom", "旧手动频率兼容为自定义");

const exported = exportData();
assert.equal(JSON.parse(exported).appVersion, "1.4.3", "新 JSON 导出包含 appVersion");
assert.equal(JSON.parse(exported).schemaVersion, "1.3.0", "新 JSON 导出包含 schemaVersion");
const imported = importData(exported);
assert.equal(imported.workItems[0].title, "旧任务", "新 JSON 可再次导入");

console.log("routine rules tests passed");
