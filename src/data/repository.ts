import { createId } from "../utils/id";
import { validateDashboardBackupData } from "../utils/backupUtils";
import type {
  Category,
  CategoryInput,
  DashboardData,
  DiaryEntry,
  DiaryEntryInput,
  Idea,
  IdeaInput,
  Project,
  ProjectInput,
  RoutineWorkTemplate,
  RoutineWorkTemplateInput,
  WorkTemplate,
  WorkTemplateInput,
  WorkResponsibilityGroup,
  WorkItem,
  WorkItemInput,
} from "../types/dashboard";
import { createEmptyDashboardData, readDashboard, replaceDashboard, writeDashboard } from "./storage";
import { todayInputValue } from "../utils/date";

// 当前实现基于 localStorage，后续可替换为 Supabase / Cloudflare D1 / Firebase。
// 页面层只调用 repository，不直接读写 localStorage，方便未来迁移云端数据库和文件存储。

export function getDashboardData(): DashboardData {
  return readDashboard();
}

export function createDiaryEntry(input: DiaryEntryInput): DiaryEntry {
  const data = readDashboard();
  const now = new Date().toISOString();
  const entry: DiaryEntry = { ...input, id: createId("diary"), createdAt: now, updatedAt: now };
  data.diaryEntries = [entry, ...data.diaryEntries];
  save(data);
  return entry;
}

export function updateDiaryEntry(id: string, input: DiaryEntryInput): DiaryEntry {
  const data = readDashboard();
  let updated: DiaryEntry | undefined;
  data.diaryEntries = data.diaryEntries.map((entry) => {
    if (entry.id !== id) return entry;
    updated = { ...entry, ...input, updatedAt: new Date().toISOString() };
    return updated;
  });
  if (!updated) throw new Error("没有找到要编辑的工作日记。");
  save(data);
  return updated;
}

export function deleteDiaryEntry(id: string): void {
  const data = readDashboard();
  data.diaryEntries = data.diaryEntries.filter((entry) => entry.id !== id);
  save(data);
}

export function createWorkItem(input: WorkItemInput): WorkItem {
  const data = readDashboard();
  const now = new Date().toISOString();
  const item: WorkItem = { ...input, completedAt: input.status === "已完成" ? now : input.completedAt || "", id: createId("work"), createdAt: now, updatedAt: now };
  data.workItems = [item, ...data.workItems];
  save(data);
  return item;
}

export function updateWorkItem(id: string, input: WorkItemInput): WorkItem {
  const data = readDashboard();
  let updated: WorkItem | undefined;
  data.workItems = data.workItems.map((item) => {
    if (item.id !== id) return item;
    const now = new Date().toISOString();
    updated = { ...item, ...input, completedAt: getNextCompletedAt(item, input, now), updatedAt: now };
    return updated;
  });
  if (!updated) throw new Error("没有找到要编辑的工作内容。");
  save(data);
  return updated;
}

export function deleteWorkItem(id: string): void {
  const data = readDashboard();
  data.workItems = data.workItems.filter((item) => item.id !== id);
  save(data);
}

export function createWorkTemplate(input: WorkTemplateInput): WorkTemplate {
  const data = readDashboard();
  const now = new Date().toISOString();
  const template: WorkTemplate = {
    ...input,
    id: createId("worktpl"),
    name: input.name.trim(),
    defaultTitle: input.defaultTitle.trim(),
    defaultContent: input.defaultContent.trim(),
    sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : getNextTemplateSortOrder(data.workTemplates),
    createdAt: now,
    updatedAt: now,
  };
  data.workTemplates = [...data.workTemplates, template].sort((a, b) => a.sortOrder - b.sortOrder);
  save(data);
  return template;
}

export function updateWorkTemplate(id: string, input: WorkTemplateInput): WorkTemplate {
  const data = readDashboard();
  let updated: WorkTemplate | undefined;
  data.workTemplates = data.workTemplates
    .map((template) => {
      if (template.id !== id) return template;
      updated = {
        ...template,
        ...input,
        name: input.name.trim(),
        defaultTitle: input.defaultTitle.trim(),
        defaultContent: input.defaultContent.trim(),
        updatedAt: new Date().toISOString(),
      };
      return updated;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (!updated) throw new Error("没有找到要编辑的工作模板。");
  save(data);
  return updated;
}

export function deleteWorkTemplate(id: string): void {
  const data = readDashboard();
  data.workTemplates = data.workTemplates.filter((template) => template.id !== id);
  save(data);
}

export function reorderWorkTemplates(templateIds: string[]): WorkTemplate[] {
  const data = readDashboard();
  const orderMap = new Map(templateIds.map((id, index) => [id, (index + 1) * 10]));
  const now = new Date().toISOString();
  data.workTemplates = data.workTemplates
    .map((template) => ({
      ...template,
      sortOrder: orderMap.get(template.id) ?? template.sortOrder,
      updatedAt: orderMap.has(template.id) ? now : template.updatedAt,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  save(data);
  return data.workTemplates;
}

export function updateWorkResponsibilities(groups: WorkResponsibilityGroup[]): WorkResponsibilityGroup[] {
  const data = readDashboard();
  data.workResponsibilities = groups;
  return save(data).workResponsibilities;
}

export function createRoutineWorkTemplate(input: RoutineWorkTemplateInput): RoutineWorkTemplate {
  const data = readDashboard();
  const now = new Date().toISOString();
  const template: RoutineWorkTemplate = {
    ...input,
    id: createId("routine"),
    name: input.name.trim(),
    description: input.description.trim(),
    weekdays: normalizeTemplateWeekdays(input.weekdays),
    monthlyDay: normalizeTemplateMonthlyDay(input.monthlyDay),
    customDate: normalizeTemplateCustomDate(input.customDate),
    createdAt: now,
    updatedAt: now,
  };
  data.routineWorkTemplates = [template, ...data.routineWorkTemplates];
  save(data);
  return template;
}

export function updateRoutineWorkTemplate(id: string, input: RoutineWorkTemplateInput): RoutineWorkTemplate {
  const data = readDashboard();
  let updated: RoutineWorkTemplate | undefined;
  data.routineWorkTemplates = data.routineWorkTemplates.map((template) => {
    if (template.id !== id) return template;
    updated = {
      ...template,
      ...input,
      name: input.name.trim(),
      description: input.description.trim(),
      weekdays: normalizeTemplateWeekdays(input.weekdays),
      monthlyDay: normalizeTemplateMonthlyDay(input.monthlyDay),
      customDate: normalizeTemplateCustomDate(input.customDate),
      updatedAt: new Date().toISOString(),
    };
    return updated;
  });
  if (!updated) throw new Error("没有找到要编辑的例行工作。");
  save(data);
  return updated;
}

export function deleteRoutineWorkTemplate(id: string): void {
  const data = readDashboard();
  data.routineWorkTemplates = data.routineWorkTemplates.filter((template) => template.id !== id);
  save(data);
}

export function generateTodayRoutineWork(date = todayInputValue()): WorkItem[] {
  const data = readDashboard();
  const dueTemplates = data.routineWorkTemplates.filter((template) => isTemplateDueToday(template, date));
  const existingKeys = new Set(
    data.workItems
      .filter((item) => item.sourceTemplateId)
      .map((item) => getRoutineScheduleKey(item.sourceTemplateId || "", item.date)),
  );
  const now = new Date().toISOString();
  const created: WorkItem[] = [];

  dueTemplates.forEach((template) => {
    const scheduleKey = getRoutineScheduleKey(template.id, date);
    if (existingKeys.has(scheduleKey)) return;
    existingKeys.add(scheduleKey);
    created.push({
      id: createId("work"),
      title: template.name,
      categoryId: template.categoryId,
      status: template.defaultStatus,
      content: template.description || `例行工作：${template.name}`,
      date,
      plannedDate: date,
      projectId: template.projectId,
      linkedProjectIds: template.projectId ? [template.projectId] : [],
      sourceTemplateId: template.id,
      sourceTemplateType: "routine",
      sourceTemplateName: template.name,
      images: [],
      createdAt: now,
      updatedAt: now,
    });
  });

  if (created.length === 0) return [];
  data.workItems = [...created, ...data.workItems];
  save(data);
  return created;
}

export function createIdea(input: IdeaInput): Idea {
  const data = readDashboard();
  const now = new Date().toISOString();
  const idea: Idea = { ...input, id: createId("idea"), createdAt: now, updatedAt: now };
  data.ideas = [idea, ...data.ideas];
  save(data);
  return idea;
}

export function updateIdea(id: string, input: IdeaInput): Idea {
  const data = readDashboard();
  let updated: Idea | undefined;
  data.ideas = data.ideas.map((idea) => {
    if (idea.id !== id) return idea;
    updated = { ...idea, ...input, updatedAt: new Date().toISOString() };
    return updated;
  });
  if (!updated) throw new Error("没有找到要编辑的临时想法。");
  save(data);
  return updated;
}

export function deleteIdea(id: string): void {
  const data = readDashboard();
  data.ideas = data.ideas.filter((idea) => idea.id !== id);
  save(data);
}

export function convertIdeaToWorkItem(id: string, input: WorkItemInput): { idea: Idea; workItem: WorkItem } {
  const data = readDashboard();
  const now = new Date().toISOString();
  const workItem: WorkItem = { ...input, id: createId("work"), createdAt: now, updatedAt: now };
  let updatedIdea: Idea | undefined;
  data.workItems = [workItem, ...data.workItems];
  data.ideas = data.ideas.map((idea) => {
    if (idea.id !== id) return idea;
    updatedIdea = { ...idea, status: "converted", convertedToType: "work", convertedToId: workItem.id, updatedAt: now };
    return updatedIdea;
  });
  if (!updatedIdea) throw new Error("没有找到要转化的临时想法。");
  save(data);
  return { idea: updatedIdea, workItem };
}

export function convertIdeaToDiaryEntry(id: string, input: DiaryEntryInput): { idea: Idea; diaryEntry: DiaryEntry } {
  const data = readDashboard();
  const now = new Date().toISOString();
  const diaryEntry: DiaryEntry = { ...input, id: createId("diary"), createdAt: now, updatedAt: now };
  let updatedIdea: Idea | undefined;
  data.diaryEntries = [diaryEntry, ...data.diaryEntries];
  data.ideas = data.ideas.map((idea) => {
    if (idea.id !== id) return idea;
    updatedIdea = { ...idea, status: "converted", convertedToType: "diary", convertedToId: diaryEntry.id, updatedAt: now };
    return updatedIdea;
  });
  if (!updatedIdea) throw new Error("没有找到要转化的临时想法。");
  save(data);
  return { idea: updatedIdea, diaryEntry };
}

export function createProject(input: ProjectInput): Project {
  const data = readDashboard();
  const now = new Date().toISOString();
  const project: Project = { ...input, id: createId("project"), createdAt: now, updatedAt: now };
  data.projects = [project, ...data.projects];
  save(data);
  return project;
}

export function updateProject(id: string, input: ProjectInput): Project {
  const data = readDashboard();
  let updated: Project | undefined;
  data.projects = data.projects.map((project) => {
    if (project.id !== id) return project;
    updated = { ...project, ...input, updatedAt: new Date().toISOString() };
    return updated;
  });
  if (!updated) throw new Error("没有找到要编辑的项目。");
  save(data);
  return updated;
}

export function deleteProject(id: string): void {
  const data = readDashboard();
  data.projects = data.projects.filter((project) => project.id !== id);
  data.diaryEntries = data.diaryEntries.map((entry) => ({
    ...entry,
    linkedProjectIds: entry.linkedProjectIds.filter((projectId) => projectId !== id),
  }));
  data.workItems = data.workItems.map((item) => ({
    ...item,
    projectId: item.projectId === id ? "" : item.projectId,
    linkedProjectIds: item.linkedProjectIds?.filter((projectId) => projectId !== id),
  }));
  data.ideas = data.ideas.map((idea) => ({
    ...idea,
    projectId: idea.projectId === id ? "" : idea.projectId,
    linkedProjectIds: idea.linkedProjectIds?.filter((projectId) => projectId !== id),
  }));
  save(data);
}

export function reorderProjects(projectIds: string[]): Project[] {
  const data = readDashboard();
  const orderMap = new Map(projectIds.map((id, index) => [id, (index + 1) * 10]));
  data.projects = data.projects.map((project) => ({
    ...project,
    sortOrder: orderMap.get(project.id) ?? project.sortOrder,
  }));
  save(data);
  return data.projects;
}

export function createCategory(input: CategoryInput): Category {
  const data = readDashboard();
  const now = new Date().toISOString();
  const category: Category = { ...input, id: createId("cat"), createdAt: now, updatedAt: now };
  data.categories = [...data.categories, category].sort((a, b) => a.sortOrder - b.sortOrder);
  save(data);
  return category;
}

export function updateCategory(id: string, input: CategoryInput): Category {
  const data = readDashboard();
  let updated: Category | undefined;
  data.categories = data.categories
    .map((category) => {
      if (category.id !== id) return category;
      updated = { ...category, ...input, updatedAt: new Date().toISOString() };
      return updated;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (!updated) throw new Error("没有找到要编辑的分类。");
  save(data);
  return updated;
}

export function deleteCategory(id: string): void {
  const data = readDashboard();
  const inUse = data.workItems.some((item) => item.categoryId === id);
  if (inUse) throw new Error("已有工作内容使用该分类，请先调整这些工作内容后再删除。");
  data.categories = data.categories.filter((category) => category.id !== id);
  save(data);
}

export function reorderCategories(categoryIds: string[]): Category[] {
  const data = readDashboard();
  const orderMap = new Map(categoryIds.map((id, index) => [id, (index + 1) * 10]));
  const now = new Date().toISOString();
  data.categories = data.categories
    .map((category) => ({
      ...category,
      sortOrder: orderMap.get(category.id) ?? category.sortOrder,
      updatedAt: orderMap.has(category.id) ? now : category.updatedAt,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  save(data);
  return data.categories;
}

export function exportData(): string {
  return JSON.stringify(readDashboard(), null, 2);
}

export function importData(payload: string | DashboardData): DashboardData {
  const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
  const validation = validateDashboardBackupData(parsed);
  if (!validation.ok) throw new Error(validation.message);
  return replaceDashboard(validation.data);
}

export function clearData(): DashboardData {
  return replaceDashboard(createEmptyDashboardData());
}

function save(data: DashboardData): DashboardData {
  data.updatedAt = new Date().toISOString();
  return writeDashboard(data);
}

function getNextCompletedAt(previous: WorkItem, input: WorkItemInput, now: string): string {
  if (input.status !== "已完成") return "";
  if (previous.status === "已完成" && previous.completedAt) return previous.completedAt;
  return input.completedAt || now;
}

function getNextTemplateSortOrder(templates: WorkTemplate[]): number {
  return templates.reduce((max, template) => Math.max(max, template.sortOrder || 0), 0) + 10;
}

function isTemplateDueToday(template: RoutineWorkTemplate, date: string): boolean {
  if (!template.enabled) return false;
  const dateParts = parseLocalDateParts(date);
  if (!dateParts) return false;
  const weekday = getIsoWeekday(dateParts);
  if (template.frequency === "daily") return true;
  if (template.frequency === "workday") return weekday >= 1 && weekday <= 5;
  if (template.frequency === "weekly") return template.weekdays.includes(weekday);
  if (template.frequency === "monthly") {
    if (!template.monthlyDay) return false;
    return dateParts.day === Math.min(template.monthlyDay, getLastDayOfMonth(dateParts.year, dateParts.month));
  }
  if (template.frequency === "custom") return template.customDate === date;
  return false;
}

function getRoutineScheduleKey(templateId: string, date: string): string {
  return `${templateId}:${date}`;
}

function parseLocalDateParts(date: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > getLastDayOfMonth(year, month)) return null;
  return { year, month, day };
}

function getIsoWeekday(dateParts: { year: number; month: number; day: number }): number {
  const day = new Date(dateParts.year, dateParts.month - 1, dateParts.day).getDay();
  return day === 0 ? 7 : day;
}

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function normalizeTemplateWeekdays(weekdays: number[]): number[] {
  return Array.from(new Set(weekdays.map(Number).filter((weekday) => Number.isInteger(weekday) && weekday >= 1 && weekday <= 7))).sort(
    (a, b) => a - b,
  );
}

function normalizeTemplateMonthlyDay(day: number | null): number | null {
  const normalized = Number(day);
  return Number.isInteger(normalized) && normalized >= 1 && normalized <= 31 ? normalized : null;
}

function normalizeTemplateCustomDate(date: string): string {
  return parseLocalDateParts(date) ? date : "";
}
