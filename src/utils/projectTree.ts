import type { Project, ProjectQuadrant } from "../types/dashboard";

export const MAX_PROJECT_DEPTH = 5;

export type ProjectMovePosition = "first" | "last" | "before" | "after";
export type ProjectDropPosition = "before" | "inside" | "after";

export function isRootProject(project: Pick<Project, "parentId">): boolean {
  return !project.parentId;
}

export function getRootProjects(projects: Project[]): Project[] {
  return projects.filter(isRootProject).sort(compareProjectOrder);
}

export function getProjectChildren(projects: Project[], parentId: string): Project[] {
  return projects.filter((project) => project.parentId === parentId).sort(compareProjectOrder);
}

export function getProjectDepth(project: Project, projects: Project[]): number {
  if (Number.isInteger(project.depth) && (project.depth || 0) > 0) return Math.min(MAX_PROJECT_DEPTH, project.depth || 1);
  let depth = 1;
  let current = project;
  const seen = new Set<string>();
  while (current.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = projects.find((item) => item.id === current.parentId);
    if (!parent) break;
    depth += 1;
    current = parent;
  }
  return Math.min(MAX_PROJECT_DEPTH, depth);
}

export function getRootProject(project: Project, projects: Project[]): Project {
  if (project.rootProjectId) {
    const rootById = projects.find((item) => item.id === project.rootProjectId);
    if (rootById) return rootById;
  }
  let current = project;
  const seen = new Set<string>();
  while (current.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = projects.find((item) => item.id === current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

export function getEffectiveProjectQuadrant(project: Project, projects: Project[]): ProjectQuadrant {
  return getRootProject(project, projects).quadrant || "important_not_urgent";
}

export function getProjectPath(project: Project, projects: Project[]): Project[] {
  const path: Project[] = [];
  let current: Project | undefined = project;
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    path.unshift(current);
    seen.add(current.id);
    current = current.parentId ? projects.find((item) => item.id === current?.parentId) : undefined;
  }
  return path;
}

export function getProjectDescendantIds(projectId: string, projects: Project[]): string[] {
  const descendants: string[] = [];
  const queue = [projectId];
  while (queue.length) {
    const parentId = queue.shift();
    if (!parentId) continue;
    const children = projects.filter((project) => project.parentId === parentId);
    children.forEach((child) => {
      descendants.push(child.id);
      queue.push(child.id);
    });
  }
  return descendants;
}

export function getProjectSubtreeHeight(projectId: string, projects: Project[]): number {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return 0;
  const children = getProjectChildren(projects, project.id);
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map((child) => getProjectSubtreeHeight(child.id, projects)));
}

export function canMoveProject(projectId: string, targetParentId: string | null, projects: Project[]): { ok: boolean; reason?: string } {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return { ok: false, reason: "没有找到要移动的项目。" };
  const root = getRootProject(project, projects);
  if (!targetParentId) {
    return isRootProject(project) ? { ok: true } : { ok: false, reason: "子项目只能在同一主项目内调整层级。" };
  }
  const target = projects.find((item) => item.id === targetParentId);
  if (!target) return { ok: false, reason: "没有找到目标项目。" };
  if (getRootProject(target, projects).id !== root.id) return { ok: false, reason: "不能跨主项目移动。" };
  if (target.id === project.id || getProjectDescendantIds(project.id, projects).includes(target.id)) {
    return { ok: false, reason: "不能移动到当前项目的下级。" };
  }
  const targetDepth = getProjectDepth(target, projects);
  const subtreeHeight = getProjectSubtreeHeight(project.id, projects);
  if (targetDepth + subtreeHeight > MAX_PROJECT_DEPTH) return { ok: false, reason: "该位置会超过 5 级层级限制。" };
  return { ok: true };
}

/**
 * Converts the pointer position within a project row into an explicit drop zone.
 * The middle zone is intentionally narrower than the two same-level zones so
 * an ordinary drag across a row prefers reordering over changing hierarchy.
 */
export function getProjectDropPosition(pointerOffsetY: number, rowHeight: number): ProjectDropPosition {
  if (!Number.isFinite(pointerOffsetY) || !Number.isFinite(rowHeight) || rowHeight <= 0) return "inside";
  const ratio = Math.max(0, Math.min(1, pointerOffsetY / rowHeight));
  if (ratio < 0.3) return "before";
  if (ratio > 0.7) return "after";
  return "inside";
}

/**
 * Returns a display-only project number. It is derived from the current tree
 * and sibling order; it is never persisted in the project name or data shape.
 */
export function getProjectNumber(project: Project, projects: Project[]): string {
  const depth = getProjectDepth(project, projects);
  const siblingIndex = getProjectSiblingIndex(project, projects);
  if (depth === 1) return `${toChineseNumber(siblingIndex)}、`;
  if (depth === 2) return String(siblingIndex);
  if (depth === 3) {
    const parent = project.parentId ? projects.find((item) => item.id === project.parentId) : undefined;
    const parentIndex = parent ? getProjectSiblingIndex(parent, projects) : 1;
    return `${parentIndex}.${siblingIndex}`;
  }
  if (depth === 4) return toCircledNumber(siblingIndex);
  return toAlphabeticNumber(siblingIndex);
}

function getProjectSiblingIndex(project: Project, projects: Project[]): number {
  const siblings = project.parentId ? getProjectChildren(projects, project.parentId) : getRootProjects(projects);
  const index = siblings.findIndex((item) => item.id === project.id);
  return index >= 0 ? index + 1 : 1;
}

function toChineseNumber(value: number): string {
  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  if (value <= 0) return digits[0];
  if (value < 10) return digits[value];
  if (value === 10) return "十";
  if (value < 20) return `十${digits[value - 10]}`;
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    return `${digits[tens]}十${ones ? digits[ones] : ""}`;
  }
  return String(value);
}

function toCircledNumber(value: number): string {
  const circled = ["", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳"];
  return circled[value] || `${value}⃝`;
}

function toAlphabeticNumber(value: number): string {
  let current = Math.max(1, value);
  let result = "";
  while (current > 0) {
    current -= 1;
    result = String.fromCharCode(65 + (current % 26)) + result;
    current = Math.floor(current / 26);
  }
  return result;
}

export function compareProjectOrder(a: Project, b: Project): number {
  const aHasOrder = Number.isFinite(Number(a.sortOrder));
  const bHasOrder = Number.isFinite(Number(b.sortOrder));
  if (aHasOrder && bHasOrder) {
    const delta = Number(a.sortOrder) - Number(b.sortOrder);
    if (delta !== 0) return delta;
  }
  if (aHasOrder !== bHasOrder) return aHasOrder ? -1 : 1;
  const createdDelta = getTimeValue(a.createdAt) - getTimeValue(b.createdAt);
  if (createdDelta !== 0) return createdDelta;
  return a.id.localeCompare(b.id);
}

function getTimeValue(value: string): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}
