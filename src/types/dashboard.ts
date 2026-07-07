export type WorkStatus = "待处理" | "进行中" | "已完成" | "暂停";
export type IdeaType = "text" | "screenshot";
export type IdeaStatus = "unorganized" | "organized" | "archived" | "converted";
export type ProjectType = "work" | "personal";
export type ProjectStatus = "未开始" | "进行中" | "暂停中" | "待验收" | "已完成" | "长期维护";
export type ProjectQuadrant = "important_urgent" | "important_not_urgent" | "urgent_not_important" | "not_important_not_urgent";
export type ProjectStepStatus = "todo" | "doing" | "done";
export type ConvertedToType = "work" | "diary";
export type RoutineWorkFrequency = "daily" | "workday" | "weekly" | "monthly" | "custom";
export type WorkTemplateDateRule = "" | "today" | "tomorrow" | "next_workday" | "next_week";
export type WorkSourceTemplateType = "routine" | "work";

export interface ProjectStep {
  id: string;
  name: string;
  description: string;
  status: ProjectStepStatus;
  dueDate: string;
  completedAt: string;
}

export interface DiaryEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  tags: string[];
  linkedProjectIds: string[];
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkItem {
  id: string;
  title: string;
  categoryId: string;
  status: WorkStatus;
  content: string;
  date: string;
  plannedDate?: string;
  projectId: string;
  linkedProjectIds?: string[];
  sourceTemplateId?: string;
  sourceTemplateType?: WorkSourceTemplateType;
  sourceTemplateName?: string;
  images?: string[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkResponsibilityGroup {
  id: string;
  name: string;
  items: string[];
  sortOrder: number;
}

export interface Idea {
  id: string;
  type: IdeaType;
  title?: string;
  content: string;
  imageDataUrl: string;
  attachments?: string[];
  status: IdeaStatus;
  projectId?: string;
  linkedProjectIds?: string[];
  tags?: string[];
  convertedToType?: ConvertedToType;
  convertedToId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineWorkTemplate {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  projectId: string;
  frequency: RoutineWorkFrequency;
  weekdays: number[];
  monthlyDay: number | null;
  customDate: string;
  defaultStatus: WorkStatus;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkTemplate {
  id: string;
  name: string;
  defaultTitle: string;
  defaultCategoryId: string;
  defaultStatus: WorkStatus;
  defaultProjectId: string;
  defaultContent: string;
  plannedDateRule: WorkTemplateDateRule;
  dueDateRule: WorkTemplateDateRule;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  description: string;
  content: string;
  progress: number;
  status: ProjectStatus;
  quadrant?: ProjectQuadrant;
  startDate?: string;
  dueDate?: string;
  background?: string;
  purpose?: string;
  expectedResult?: string;
  acceptanceCriteria?: string;
  executionSteps?: ProjectStep[];
  currentProgress?: string;
  nextAction?: string;
  blockers?: string;
  riskNotes?: string;
  completionResult?: string;
  retrospective?: string;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  version: string;
  appVersion: string;
  schemaVersion: string;
  updatedAt: string;
  migrations: string[];
  diaryEntries: DiaryEntry[];
  workItems: WorkItem[];
  ideas: Idea[];
  categories: Category[];
  projects: Project[];
  workResponsibilities: WorkResponsibilityGroup[];
  routineWorkTemplates: RoutineWorkTemplate[];
  workTemplates: WorkTemplate[];
}

export type DiaryEntryInput = Omit<DiaryEntry, "id" | "createdAt" | "updatedAt">;
export type WorkItemInput = Omit<WorkItem, "id" | "createdAt" | "updatedAt">;
export type IdeaInput = Omit<Idea, "id" | "createdAt" | "updatedAt">;
export type CategoryInput = Omit<Category, "id" | "createdAt" | "updatedAt">;
export type ProjectInput = Omit<Project, "id" | "createdAt" | "updatedAt">;
export type WorkResponsibilityGroupInput = WorkResponsibilityGroup;
export type RoutineWorkTemplateInput = Omit<RoutineWorkTemplate, "id" | "createdAt" | "updatedAt">;
export type WorkTemplateInput = Omit<WorkTemplate, "id" | "createdAt" | "updatedAt">;

export const WORK_STATUSES: WorkStatus[] = ["待处理", "进行中", "已完成", "暂停"];
export const IDEA_STATUSES: IdeaStatus[] = ["unorganized", "organized", "archived", "converted"];
export const PROJECT_STATUSES: ProjectStatus[] = ["未开始", "进行中", "暂停中", "待验收", "已完成", "长期维护"];
export const PROJECT_QUADRANTS: ProjectQuadrant[] = [
  "important_urgent",
  "important_not_urgent",
  "urgent_not_important",
  "not_important_not_urgent",
];
export const PROJECT_STEP_STATUSES: ProjectStepStatus[] = ["todo", "doing", "done"];
export const ROUTINE_WORK_FREQUENCIES: RoutineWorkFrequency[] = ["daily", "workday", "weekly", "monthly", "custom"];
export const WORK_TEMPLATE_DATE_RULES: WorkTemplateDateRule[] = ["", "today", "tomorrow", "next_workday", "next_week"];
