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
  ProjectQuadrant,
  ProjectStep,
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
import { addDays, getChinaWorkdayCheck, getNextChinaWorkingDay } from "./chinaWorkCalendar";
import {
  createRoutineGenerationPlan,
  getAutoRecoveredTemplate,
  getRoutineRuleIdFromItem,
  isOpenRoutineItem,
  isRoutineItem,
  mergeRoutineTrace,
} from "./routineScheduler";
import {
  canMoveProject,
  getProjectChildren,
  getProjectDepth,
  getProjectDescendantIds,
  getRootProject,
  getRootProjects,
  MAX_PROJECT_DEPTH,
} from "../utils/projectTree";

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
  return updateRoutineWorkTemplateWithMode(id, input, "future");
}

export function updateRoutineWorkTemplateWithMode(
  id: string,
  input: RoutineWorkTemplateInput,
  mode: "future" | "sync_open" = "future",
): RoutineWorkTemplate {
  const data = readDashboard();
  let updated: RoutineWorkTemplate | undefined;
  const now = new Date().toISOString();
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
      updatedAt: now,
    };
    return updated;
  });
  if (!updated) throw new Error("没有找到要编辑的例行工作。");
  if (mode === "sync_open") {
    data.workItems = data.workItems.map((item) => {
      if (getRoutineRuleIdFromItem(item) !== id || !isOpenRoutineItem(item) || item.routineManualPostponed) return item;
      return {
        ...item,
        title: updated?.name || item.title,
        categoryId: updated?.categoryId || item.categoryId,
        content: updated?.description || item.content,
        projectId: updated?.projectId || "",
        linkedProjectIds: updated?.projectId ? [updated.projectId] : [],
        sourceTemplateName: updated?.name || item.sourceTemplateName,
        status: updated?.defaultStatus || item.status,
        updatedAt: now,
      };
    });
  }
  save(data);
  return updated;
}

export function pauseRoutineWorkTemplate(
  id: string,
  pendingTaskPolicy: RoutineWorkTemplate["pendingTaskPolicy"],
  pausedUntil = "",
  resumeStrategy: RoutineWorkTemplate["resumeStrategy"] = "resume_today",
): RoutineWorkTemplate {
  const data = readDashboard();
  const now = new Date().toISOString();
  let updated: RoutineWorkTemplate | undefined;
  data.routineWorkTemplates = data.routineWorkTemplates.map((template) => {
    if (template.id !== id) return template;
    updated = {
      ...template,
      paused: true,
      pausedUntil: normalizeTemplateCustomDate(pausedUntil),
      pauseResumeMode: pausedUntil ? "date" : "manual",
      resumeStrategy,
      pendingTaskPolicy,
      updatedAt: now,
    };
    return updated;
  });
  if (!updated) throw new Error("没有找到要暂停的例行工作。");
  data.workItems = data.workItems.flatMap((item) => {
    if (getRoutineRuleIdFromItem(item) !== id || !isOpenRoutineItem(item)) return [item];
    if (pendingTaskPolicy === "skip") {
      return [{ ...item, status: "已跳过", routineSkipped: true, routineSkippedAt: todayInputValue(), updatedAt: now }];
    }
    if (pendingTaskPolicy === "postpone_to_resume" && pausedUntil) {
      return [{ ...item, date: pausedUntil, plannedDate: pausedUntil, routineManualPostponed: true, routineActualDate: pausedUntil, updatedAt: now }];
    }
    return [item];
  });
  save(data);
  return updated;
}

export function resumeRoutineWorkTemplate(id: string, strategy: RoutineWorkTemplate["resumeStrategy"] = "resume_today"): RoutineWorkTemplate {
  const data = readDashboard();
  let updated: RoutineWorkTemplate | undefined;
  data.routineWorkTemplates = data.routineWorkTemplates.map((template) => {
    if (template.id !== id) return template;
    updated = { ...template, paused: false, pausedUntil: "", pauseResumeMode: "manual", resumeStrategy: strategy, updatedAt: new Date().toISOString() };
    return updated;
  });
  if (!updated) throw new Error("没有找到要恢复的例行工作。");
  save(data);
  if (strategy === "resume_today") generateTodayRoutineWork(todayInputValue());
  return updated;
}

export function deleteRoutineWorkTemplate(id: string, pendingAction: "keep" | "skip" | "delete" = "keep"): void {
  const data = readDashboard();
  const now = new Date().toISOString();
  data.routineWorkTemplates = data.routineWorkTemplates.filter((template) => template.id !== id);
  data.workItems = data.workItems.flatMap((item) => {
    if (getRoutineRuleIdFromItem(item) !== id || !isOpenRoutineItem(item)) return [item];
    if (pendingAction === "delete") return [];
    if (pendingAction === "skip") {
      return [{ ...item, status: "已跳过", routineSkipped: true, routineSkippedAt: todayInputValue(), updatedAt: now }];
    }
    return [
      {
        ...item,
        sourceTemplateId: undefined,
        sourceTemplateType: undefined,
        routineDetachedFromRuleId: id,
        updatedAt: now,
      },
    ];
  });
  save(data);
}

export function generateTodayRoutineWork(date = todayInputValue()): WorkItem[] {
  return syncRoutineWorkForDate(date).created;
}

export function syncRoutineWorkForDate(date = todayInputValue()): { created: WorkItem[]; updated: WorkItem[]; warnings: string[] } {
  const data = readDashboard();
  let templatesChanged = false;
  data.routineWorkTemplates = data.routineWorkTemplates.map((template) => {
    const recovered = getAutoRecoveredTemplate(template, date);
    if (recovered === template) return template;
    templatesChanged = true;
    return { ...recovered, updatedAt: new Date().toISOString() };
  });
  const plan = createRoutineGenerationPlan(data.routineWorkTemplates, date);
  const now = new Date().toISOString();
  const created: WorkItem[] = [];
  const updated: WorkItem[] = [];

  plan.triggers.forEach((trigger) => {
    const template = data.routineWorkTemplates.find((entry) => entry.id === trigger.ruleId);
    if (!template) return;
    const existing = data.workItems.find((item) => getRoutineRuleIdFromItem(item) === template.id && item.date === trigger.actualDate);
    if (existing?.status === "已完成" || existing?.status === "已跳过" || existing?.routineSkipped) return;
    if (existing) {
      const merged = mergeRoutineTrace(existing, {
        routineOriginalDate: trigger.originalDate,
        routineHolidayPostponed: trigger.holidayPostponed,
      });
      const traceChanged =
        merged.routineMerged !== existing.routineMerged ||
        merged.routineHolidayPostponed !== existing.routineHolidayPostponed ||
        merged.routineManualPostponed !== existing.routineManualPostponed ||
        JSON.stringify(merged.routineMergedTriggerDates || []) !== JSON.stringify(existing.routineMergedTriggerDates || []);
      if (!traceChanged) return;
      data.workItems = data.workItems.map((item) => (item.id === existing.id ? { ...merged, updatedAt: now } : item));
      updated.push({ ...merged, updatedAt: now });
      return;
    }
    const item: WorkItem = {
      id: createId("work"),
      title: template.name,
      categoryId: template.categoryId,
      status: template.defaultStatus,
      content: template.description || `例行工作：${template.name}`,
      date: trigger.actualDate,
      plannedDate: trigger.actualDate,
      projectId: template.projectId,
      linkedProjectIds: template.projectId ? [template.projectId] : [],
      sourceTemplateId: template.id,
      sourceTemplateType: "routine",
      sourceTemplateName: template.name,
      routineRuleId: template.id,
      routineOriginalDate: trigger.originalDate,
      routineActualDate: trigger.actualDate,
      routineHolidayPostponed: trigger.holidayPostponed,
      routineManualPostponed: false,
      routineSkipped: false,
      routineSkippedAt: "",
      routineSkipReason: "",
      routineMerged: false,
      routineMergedTriggerDates: [trigger.originalDate],
      images: [],
      createdAt: now,
      updatedAt: now,
    };
    created.push(item);
  });

  if (created.length > 0) data.workItems = [...created, ...data.workItems];
  if (templatesChanged || created.length > 0 || updated.length > 0) save(data);
  return { created, updated, warnings: plan.warnings };
}

export function skipRoutineWorkItem(id: string, reason = ""): WorkItem {
  const data = readDashboard();
  const now = new Date().toISOString();
  let updated: WorkItem | undefined;
  data.workItems = data.workItems.map((item) => {
    if (item.id !== id) return item;
    updated = {
      ...item,
      status: "已跳过",
      routineSkipped: true,
      routineSkippedAt: todayInputValue(),
      routineSkipReason: reason.trim(),
      updatedAt: now,
    };
    return updated;
  });
  if (!updated) throw new Error("没有找到要跳过的例行工作。");
  save(data);
  return updated;
}

export function postponeRoutineWorkItem(id: string, targetDate: string): WorkItem {
  const data = readDashboard();
  const source = data.workItems.find((item) => item.id === id);
  if (!source) throw new Error("没有找到要顺延的例行工作。");
  const ruleId = getRoutineRuleIdFromItem(source);
  const now = new Date().toISOString();
  const existing = data.workItems.find((item) => item.id !== id && getRoutineRuleIdFromItem(item) === ruleId && item.date === targetDate && isOpenRoutineItem(item));
  if (existing) {
    const merged = mergeRoutineTrace(existing, {
      routineOriginalDate: source.routineOriginalDate || source.date,
      routineHolidayPostponed: source.routineHolidayPostponed,
      routineManualPostponed: true,
    });
    data.workItems = data.workItems
      .filter((item) => item.id !== id)
      .map((item) => (item.id === existing.id ? { ...merged, routineManualPostponed: true, updatedAt: now } : item));
    save(data);
    return { ...merged, routineManualPostponed: true, updatedAt: now };
  }

  let updated: WorkItem | undefined;
  data.workItems = data.workItems.map((item) => {
    if (item.id !== id) return item;
    updated = {
      ...item,
      date: targetDate,
      plannedDate: targetDate,
      routineActualDate: targetDate,
      routineManualPostponed: true,
      updatedAt: now,
    };
    return updated;
  });
  if (!updated) throw new Error("没有找到要顺延的例行工作。");
  save(data);
  return updated;
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
  if (!updated) throw new Error("没有找到要编辑的灵感。");
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
  if (!updatedIdea) throw new Error("没有找到要转化的灵感。");
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
  if (!updatedIdea) throw new Error("没有找到要转化的灵感。");
  save(data);
  return { idea: updatedIdea, diaryEntry };
}

export function createProject(input: ProjectInput): Project {
  const data = readDashboard();
  const now = new Date().toISOString();
  const parentId = input.parentId || null;
  const parent = parentId ? data.projects.find((item) => item.id === parentId) : undefined;
  if (parentId && !parent) throw new Error("没有找到上级项目。");
  if (parent && getProjectDepth(parent, data.projects) >= MAX_PROJECT_DEPTH) throw new Error("项目最多支持 5 级层级。");
  const root = parent ? getRootProject(parent, data.projects) : undefined;
  const siblings = parent ? getProjectChildren(data.projects, parent.id) : getRootProjects(data.projects);
  const project: Project = {
    ...input,
    id: createId("project"),
    parentId,
    rootProjectId: root?.id,
    depth: parent ? getProjectDepth(parent, data.projects) + 1 : 1,
    quadrant: parent ? root?.quadrant || "important_not_urgent" : input.quadrant || "important_not_urgent",
    isDelayed: input.isDelayed === true,
    status: "未开始",
    sortOrder: getNextProjectSortOrder(siblings),
    createdAt: now,
    updatedAt: now,
  };
  project.rootProjectId = root?.id || project.id;
  data.projects = [project, ...data.projects];
  save(data);
  return project;
}

export function updateProject(id: string, input: ProjectInput): Project {
  const data = readDashboard();
  let updated: Project | undefined;
  data.projects = data.projects.map((project) => {
    if (project.id !== id) return project;
    const root = getRootProject(project, data.projects);
    updated = {
      ...project,
      ...input,
      parentId: project.parentId || null,
      rootProjectId: project.rootProjectId || root.id,
      depth: project.depth || getProjectDepth(project, data.projects),
      quadrant: project.parentId ? root.quadrant : input.quadrant || project.quadrant || "important_not_urgent",
      isDelayed: input.isDelayed === true,
      updatedAt: new Date().toISOString(),
    };
    return updated;
  });
  if (!updated) throw new Error("没有找到要编辑的项目。");
  save(data);
  return updated;
}

export function deleteProject(id: string): void {
  const data = readDashboard();
  const removedIds = new Set([id, ...getProjectDescendantIds(id, data.projects)]);
  data.projects = data.projects.filter((project) => !removedIds.has(project.id));
  data.diaryEntries = data.diaryEntries.map((entry) => ({
    ...entry,
    linkedProjectIds: entry.linkedProjectIds.filter((projectId) => !removedIds.has(projectId)),
  }));
  data.workItems = data.workItems.map((item) => ({
    ...item,
    projectId: removedIds.has(item.projectId) ? "" : item.projectId,
    linkedProjectIds: item.linkedProjectIds?.filter((projectId) => !removedIds.has(projectId)),
  }));
  data.ideas = data.ideas.map((idea) => ({
    ...idea,
    projectId: idea.projectId && removedIds.has(idea.projectId) ? "" : idea.projectId,
    linkedProjectIds: idea.linkedProjectIds?.filter((projectId) => !removedIds.has(projectId)),
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

export function reorderProjectNodes(parentId: string | null, projectIds: string[]): Project[] {
  const data = readDashboard();
  const siblings = parentId ? getProjectChildren(data.projects, parentId) : getRootProjects(data.projects);
  const siblingIds = new Set(siblings.map((project) => project.id));
  if (projectIds.some((id) => !siblingIds.has(id)) || projectIds.length !== siblings.length) throw new Error("项目排序范围无效。");
  const orderMap = new Map(projectIds.map((id, index) => [id, (index + 1) * 10]));
  data.projects = data.projects.map((project) => (orderMap.has(project.id) ? { ...project, sortOrder: orderMap.get(project.id) } : project));
  save(data);
  return data.projects;
}

export function moveProjectNode(id: string, targetParentId: string | null, position: "first" | "last" = "last"): Project[] {
  const data = readDashboard();
  const project = data.projects.find((item) => item.id === id);
  if (!project) throw new Error("没有找到要移动的项目。");
  const validation = canMoveProject(id, targetParentId, data.projects);
  if (!validation.ok) throw new Error(validation.reason || "不能移动到当前目标。");
  const targetParent = targetParentId ? data.projects.find((item) => item.id === targetParentId) : undefined;
  const oldParentId = project.parentId || null;
  const newSiblings = (targetParent ? getProjectChildren(data.projects, targetParent.id) : getRootProjects(data.projects)).filter((item) => item.id !== id);
  const orderedIds = position === "first" ? [id, ...newSiblings.map((item) => item.id)] : [...newSiblings.map((item) => item.id), id];
  const root = targetParent ? getRootProject(targetParent, data.projects) : project;
  const now = new Date().toISOString();
  const movedIds = new Set([id, ...getProjectDescendantIds(id, data.projects)]);
  const nextParentId = targetParent?.id || null;
  data.projects = data.projects.map((item) => {
    if (item.id === id) {
      return { ...item, parentId: nextParentId, rootProjectId: root.id, depth: targetParent ? getProjectDepth(targetParent, data.projects) + 1 : 1, updatedAt: now };
    }
    if (!movedIds.has(item.id)) return item;
    const movedRootDepth = targetParent ? getProjectDepth(targetParent, data.projects) + 1 : 1;
    return { ...item, rootProjectId: root.id, depth: getDepthFromAncestor(item.id, id, movedRootDepth, data.projects), updatedAt: now };
  });
  const orderMap = new Map(orderedIds.map((itemId, index) => [itemId, (index + 1) * 10]));
  data.projects = data.projects.map((item) => {
    if (orderMap.has(item.id)) return { ...item, sortOrder: orderMap.get(item.id) };
    if (oldParentId !== nextParentId && item.parentId === oldParentId && !movedIds.has(item.id)) return item;
    return item;
  });
  if (oldParentId !== nextParentId) data.projects = normalizeSiblingSortOrders(data.projects, oldParentId);
  save(data);
  return data.projects;
}

export function moveProjectToQuadrant(id: string, quadrant: ProjectQuadrant): Project {
  const data = readDashboard();
  const project = data.projects.find((item) => item.id === id);
  if (!project) throw new Error("没有找到要移动的项目。");
  if (project.parentId) throw new Error("子项目不能单独调整四象限。");
  const updated = { ...project, quadrant, updatedAt: new Date().toISOString() };
  data.projects = data.projects.map((item) => (item.id === id ? updated : item));
  save(data);
  return updated;
}

export function createProjectAction(projectId: string, input: Omit<ProjectStep, "id">): ProjectStep {
  const data = readDashboard();
  const now = new Date().toISOString();
  const action: ProjectStep = {
    ...input,
    id: createId("action"),
    name: input.name.trim(),
    description: input.description.trim(),
    completedAt: input.status === "done" ? input.completedAt || todayInputValue() : "",
  };
  let found = false;
  data.projects = data.projects.map((project) => {
    if (project.id !== projectId) return project;
    found = true;
    return { ...project, executionSteps: [...(project.executionSteps || []), action], updatedAt: now };
  });
  if (!found) throw new Error("没有找到所属项目。");
  save(data);
  return action;
}

export function updateProjectAction(projectId: string, actionId: string, input: Omit<ProjectStep, "id">): ProjectStep {
  const data = readDashboard();
  const now = new Date().toISOString();
  let updated: ProjectStep | undefined;
  data.projects = data.projects.map((project) => {
    if (project.id !== projectId) return project;
    const steps = (project.executionSteps || []).map((step) => {
      if (step.id !== actionId) return step;
      updated = {
        ...step,
        ...input,
        name: input.name.trim(),
        description: input.description.trim(),
        completedAt: input.status === "done" ? input.completedAt || step.completedAt || todayInputValue() : "",
      };
      return updated;
    });
    return { ...project, executionSteps: steps, updatedAt: now };
  });
  if (!updated) throw new Error("没有找到要编辑的推进事项。");
  save(data);
  return updated;
}

export function deleteProjectAction(projectId: string, actionId: string): void {
  const data = readDashboard();
  let found = false;
  data.projects = data.projects.map((project) => {
    if (project.id !== projectId) return project;
    found = (project.executionSteps || []).some((step) => step.id === actionId);
    return { ...project, executionSteps: (project.executionSteps || []).filter((step) => step.id !== actionId), updatedAt: found ? new Date().toISOString() : project.updatedAt };
  });
  if (!found) throw new Error("没有找到要删除的推进事项。");
  save(data);
}

export function moveProjectAction(sourceProjectId: string, actionId: string, targetProjectId: string): ProjectStep {
  const data = readDashboard();
  const source = data.projects.find((project) => project.id === sourceProjectId);
  const target = data.projects.find((project) => project.id === targetProjectId);
  if (!source || !target) throw new Error("没有找到推进事项或目标项目。");
  if (getRootProject(source, data.projects).id !== getRootProject(target, data.projects).id) throw new Error("推进事项不能跨主项目移动。");
  const action = (source.executionSteps || []).find((step) => step.id === actionId);
  if (!action) throw new Error("没有找到要移动的推进事项。");
  if (sourceProjectId === targetProjectId) return action;
  const now = new Date().toISOString();
  data.projects = data.projects.map((project) => {
    if (project.id === sourceProjectId) return { ...project, executionSteps: (project.executionSteps || []).filter((step) => step.id !== actionId), updatedAt: now };
    if (project.id === targetProjectId) return { ...project, executionSteps: [...(project.executionSteps || []), action], updatedAt: now };
    return project;
  });
  save(data);
  return action;
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

function getNextProjectSortOrder(projects: Project[]): number {
  return projects.reduce((max, project) => Math.max(max, project.sortOrder || 0), 0) + 10;
}

function getDepthFromAncestor(itemId: string, ancestorId: string, ancestorDepth: number, projects: Project[]): number {
  let current = projects.find((project) => project.id === itemId);
  let distance = 1;
  const seen = new Set<string>();
  while (current?.parentId && current.parentId !== ancestorId && !seen.has(current.id)) {
    seen.add(current.id);
    current = projects.find((project) => project.id === current?.parentId);
    distance += 1;
  }
  return Math.min(MAX_PROJECT_DEPTH, ancestorDepth + distance);
}

function normalizeSiblingSortOrders(projects: Project[], parentId: string | null): Project[] {
  const siblings = parentId ? getProjectChildren(projects, parentId) : getRootProjects(projects);
  const orderMap = new Map(siblings.map((project, index) => [project.id, (index + 1) * 10]));
  return projects.map((project) => (orderMap.has(project.id) ? { ...project, sortOrder: orderMap.get(project.id) } : project));
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
