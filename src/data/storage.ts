import { createSeedData } from "./seed";
import type {
  DashboardData,
  DiaryEntry,
  Idea,
  Project,
  ProjectQuadrant,
  ProjectStatus,
  ProjectStep,
  ProjectStepStatus,
  RoutineWorkFrequency,
  RoutineWorkTemplate,
  WorkTemplate,
  WorkTemplateDateRule,
  WorkResponsibilityGroup,
  WorkItem,
  WorkStatus,
} from "../types/dashboard";
import { APP_VERSION, SCHEMA_VERSION } from "./appVersion";
import { applyWorkResponsibilitiesV1Migration } from "./workResponsibilitiesMigration";

export const STORAGE_KEY = "personal-dashboard-template:v1";

export function createEmptyDashboardData(): DashboardData {
  return {
    version: APP_VERSION,
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    migrations: [],
    diaryEntries: [],
    workItems: [],
    ideas: [],
    categories: [],
    projects: [],
    workResponsibilities: [],
    routineWorkTemplates: [],
    workTemplates: [],
  };
}

export function readDashboard(): DashboardData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = migrateDashboardData(normalizeDashboardData(createSeedData()));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const normalized = normalizeDashboardData(JSON.parse(raw));
    const migrated = applyWorkResponsibilitiesV1Migration(normalized);
    if (migrated.changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated.data));
    return migrated.data;
  } catch {
    const seeded = migrateDashboardData(normalizeDashboardData(createSeedData()));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

export function writeDashboard(data: DashboardData): DashboardData {
  const normalized = normalizeDashboardData(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function replaceDashboard(data: DashboardData): DashboardData {
  const normalized = migrateDashboardData(normalizeDashboardData(data));
  normalized.updatedAt = new Date().toISOString();
  writeDashboard(normalized);
  return normalized;
}

function normalizeDashboardData(value: Partial<DashboardData>): DashboardData {
  return {
    version: APP_VERSION,
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: value.updatedAt || new Date().toISOString(),
    migrations: Array.isArray(value.migrations) ? value.migrations.map(String) : [],
    diaryEntries: Array.isArray(value.diaryEntries) ? value.diaryEntries.map(normalizeDiaryEntry) : [],
    workItems: Array.isArray(value.workItems) ? value.workItems.map(normalizeWorkItem) : [],
    ideas: Array.isArray(value.ideas) ? value.ideas.map(normalizeIdea) : [],
    categories: Array.isArray(value.categories) ? value.categories : [],
    projects: Array.isArray(value.projects) ? value.projects.map(normalizeProject) : [],
    workResponsibilities: Array.isArray(value.workResponsibilities)
      ? value.workResponsibilities.map(normalizeWorkResponsibilityGroup).sort((a, b) => a.sortOrder - b.sortOrder)
      : [],
    routineWorkTemplates: Array.isArray(value.routineWorkTemplates) ? value.routineWorkTemplates.map(normalizeRoutineWorkTemplate) : [],
    workTemplates: Array.isArray(value.workTemplates)
      ? value.workTemplates.map(normalizeWorkTemplate).sort((a, b) => a.sortOrder - b.sortOrder)
      : [],
  };
}

function migrateDashboardData(data: DashboardData): DashboardData {
  const migrated = applyWorkResponsibilitiesV1Migration(data).data;
  const migrationName = "v1.1.0-workbench-planned-date-templates";
  if (!migrated.migrations.includes(migrationName)) {
    migrated.migrations = [...migrated.migrations, migrationName];
  }
  migrated.version = APP_VERSION;
  migrated.appVersion = APP_VERSION;
  migrated.schemaVersion = SCHEMA_VERSION;
  return migrated;
}

function normalizeDiaryEntry(entry: Partial<DiaryEntry>): DiaryEntry {
  return {
    id: String(entry.id || crypto.randomUUID()),
    date: entry.date || new Date().toISOString().slice(0, 10),
    title: entry.title || "未命名工作日记",
    content: entry.content || "",
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    linkedProjectIds: Array.isArray(entry.linkedProjectIds) ? entry.linkedProjectIds : [],
    images: compactImages(entry.images),
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString(),
  };
}

function normalizeWorkItem(item: Partial<WorkItem>): WorkItem {
  return {
    id: String(item.id || crypto.randomUUID()),
    title: item.title || "未命名工作内容",
    categoryId: item.categoryId || "",
    status: normalizeWorkStatus(item.status),
    content: item.content || "",
    date: item.date || new Date().toISOString().slice(0, 10),
    plannedDate: normalizeIsoDate(item.plannedDate),
    projectId: item.projectId || "",
    linkedProjectIds: Array.isArray(item.linkedProjectIds) ? item.linkedProjectIds : item.projectId ? [item.projectId] : [],
    sourceTemplateId: item.sourceTemplateId || undefined,
    sourceTemplateType: normalizeWorkSourceTemplateType(item.sourceTemplateType, item.sourceTemplateId),
    sourceTemplateName: item.sourceTemplateName || "",
    images: compactImages(item.images),
    completedAt: typeof item.completedAt === "string" ? item.completedAt : "",
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
  };
}

function normalizeRoutineWorkTemplate(template: Partial<RoutineWorkTemplate>): RoutineWorkTemplate {
  return {
    id: String(template.id || crypto.randomUUID()),
    name: template.name || "未命名例行工作",
    description: template.description || "",
    categoryId: template.categoryId || "",
    projectId: template.projectId || "",
    frequency: normalizeRoutineWorkFrequency(template.frequency),
    weekdays: normalizeWeekdays(template.weekdays),
    monthlyDay: normalizeMonthlyDay(template.monthlyDay),
    customDate: normalizeIsoDate(template.customDate),
    defaultStatus: normalizeWorkStatus(template.defaultStatus),
    enabled: template.enabled !== false,
    createdAt: template.createdAt || new Date().toISOString(),
    updatedAt: template.updatedAt || template.createdAt || new Date().toISOString(),
  };
}

function normalizeWorkTemplate(template: Partial<WorkTemplate>, index: number): WorkTemplate {
  return {
    id: String(template.id || crypto.randomUUID()),
    name: template.name || "未命名工作模板",
    defaultTitle: template.defaultTitle || "",
    defaultCategoryId: template.defaultCategoryId || "",
    defaultStatus: normalizeWorkStatus(template.defaultStatus),
    defaultProjectId: template.defaultProjectId || "",
    defaultContent: template.defaultContent || "",
    plannedDateRule: normalizeWorkTemplateDateRule(template.plannedDateRule),
    dueDateRule: normalizeWorkTemplateDateRule(template.dueDateRule),
    enabled: template.enabled !== false,
    sortOrder: Number.isFinite(Number(template.sortOrder)) ? Number(template.sortOrder) : (index + 1) * 10,
    createdAt: template.createdAt || new Date().toISOString(),
    updatedAt: template.updatedAt || template.createdAt || new Date().toISOString(),
  };
}

function normalizeIdea(idea: Partial<Idea> & { imageDataUrl?: string; images?: string[] }): Idea {
  const attachments = compactImages(idea.attachments || idea.images, idea.imageDataUrl);
  const content = idea.content || "";
  return {
    id: String(idea.id || crypto.randomUUID()),
    type: idea.type || (attachments.length > 0 ? "screenshot" : "text"),
    title: idea.title || makeIdeaTitle(content, attachments.length > 0),
    content,
    imageDataUrl: idea.imageDataUrl || attachments[0] || "",
    attachments,
    status: normalizeIdeaStatus(idea.status),
    projectId: idea.projectId || "",
    linkedProjectIds: Array.isArray(idea.linkedProjectIds) ? idea.linkedProjectIds : idea.projectId ? [idea.projectId] : [],
    tags: Array.isArray(idea.tags) ? idea.tags : [],
    convertedToType: idea.convertedToType,
    convertedToId: idea.convertedToId,
    createdAt: idea.createdAt || new Date().toISOString(),
    updatedAt: idea.updatedAt || idea.createdAt || new Date().toISOString(),
  };
}

function normalizeProject(project: Partial<Project>): Project {
  const description = project.description || "";
  const content = project.content || "";
  return {
    id: String(project.id || crypto.randomUUID()),
    name: project.name || "未命名项目",
    type: project.type === "personal" ? "personal" : "work",
    description,
    content,
    progress: clampProgress(project.progress),
    status: normalizeProjectStatus(project.status),
    quadrant: normalizeProjectQuadrant(project.quadrant),
    startDate: project.startDate || "",
    dueDate: project.dueDate || "",
    background: project.background || description,
    purpose: project.purpose || "",
    expectedResult: project.expectedResult || "",
    acceptanceCriteria: project.acceptanceCriteria || "",
    executionSteps: Array.isArray(project.executionSteps) ? project.executionSteps.map(normalizeProjectStep) : [],
    currentProgress: project.currentProgress || content,
    nextAction: project.nextAction || "",
    blockers: project.blockers || "",
    riskNotes: project.riskNotes || "",
    completionResult: project.completionResult || "",
    retrospective: project.retrospective || "",
    sortOrder: Number.isFinite(Number(project.sortOrder)) ? Number(project.sortOrder) : undefined,
    createdAt: project.createdAt || new Date().toISOString(),
    updatedAt: project.updatedAt || project.createdAt || new Date().toISOString(),
  };
}

function normalizeProjectStep(step: Partial<ProjectStep>): ProjectStep {
  return {
    id: step.id || crypto.randomUUID(),
    name: step.name || "未命名步骤",
    description: step.description || "",
    status: normalizeProjectStepStatus(step.status),
    dueDate: step.dueDate || "",
    completedAt: step.completedAt || "",
  };
}

function normalizeWorkResponsibilityGroup(group: Partial<WorkResponsibilityGroup>, index: number): WorkResponsibilityGroup {
  return {
    id: String(group.id || crypto.randomUUID()),
    name: group.name || "未命名职责分类",
    items: Array.isArray(group.items) ? group.items.map((item) => String(item).trim()).filter(Boolean) : [],
    sortOrder: Number.isFinite(Number(group.sortOrder)) ? Number(group.sortOrder) : (index + 1) * 10,
  };
}

function compactImages(images?: string[], extra?: string) {
  return [...(Array.isArray(images) ? images : []), extra || ""].filter((image, index, all) => Boolean(image) && all.indexOf(image) === index);
}

function makeIdeaTitle(content: string, hasImage: boolean) {
  const text = content.trim();
  if (text) return text.slice(0, 24);
  return hasImage ? "未命名图文记录" : "未命名临时想法";
}

function normalizeIdeaStatus(status?: string): Idea["status"] {
  if (status === "organized" || status === "archived" || status === "converted") return status;
  return "unorganized";
}

function normalizeWorkStatus(status?: string): WorkStatus {
  if (status === "进行中" || status === "已完成" || status === "暂停") return status;
  return "待处理";
}

function normalizeRoutineWorkFrequency(frequency?: string): RoutineWorkFrequency {
  if (frequency === "daily" || frequency === "weekly" || frequency === "monthly" || frequency === "custom") return frequency;
  if (frequency === "manual") return "custom";
  return "workday";
}

function normalizeWeekdays(weekdays?: number[]): number[] {
  const normalized = Array.isArray(weekdays)
    ? weekdays.map(Number).filter((weekday) => Number.isInteger(weekday) && weekday >= 1 && weekday <= 7)
    : [];
  return Array.from(new Set(normalized)).sort((a, b) => a - b);
}

function normalizeMonthlyDay(value: unknown): number | null {
  const day = Number(value);
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null;
}

function normalizeIsoDate(value: unknown): string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function normalizeWorkTemplateDateRule(value: unknown): WorkTemplateDateRule {
  if (value === "today" || value === "tomorrow" || value === "next_workday" || value === "next_week") return value;
  return "";
}

function normalizeWorkSourceTemplateType(value: unknown, sourceTemplateId?: string): WorkItem["sourceTemplateType"] {
  if (value === "work") return "work";
  if (value === "routine" || sourceTemplateId) return "routine";
  return undefined;
}

function normalizeProjectStatus(status?: string): ProjectStatus {
  if (status === "进行中" || status === "暂停中" || status === "待验收" || status === "已完成" || status === "长期维护") return status;
  return "未开始";
}

function normalizeProjectQuadrant(quadrant?: string): ProjectQuadrant {
  if (quadrant === "important_urgent" || quadrant === "urgent_not_important" || quadrant === "not_important_not_urgent") return quadrant;
  return "important_not_urgent";
}

function normalizeProjectStepStatus(status?: string): ProjectStepStatus {
  if (status === "doing" || status === "done") return status;
  return "todo";
}

function clampProgress(value?: number) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

