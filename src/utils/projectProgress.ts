import type { Project, ProjectStep, ProjectStatus } from "../types/dashboard";

export interface ProjectProgressSummary {
  hasProgressItems: boolean;
  total: number;
  completed: number;
  percent: number | null;
  label: string;
  detail: string;
  source?: "children" | "actions" | "none";
}

export function getProjectProgressSummary(project: Pick<Project, "executionSteps"> & Partial<Pick<Project, "id">>, projects: Project[] = [], visited = new Set<string>()): ProjectProgressSummary {
  const projectId = project.id;
  const children = projectId ? projects.filter((item) => item.parentId === projectId) : [];
  if (children.length > 0 && (!projectId || !visited.has(projectId))) {
    const nextVisited = new Set(visited);
    if (projectId) nextVisited.add(projectId);
    const summaries = children.map((child) => getProjectProgressSummary(child, projects, nextVisited));
    const percent = Math.round(summaries.reduce((sum, summary) => sum + (summary.percent || 0), 0) / summaries.length);
    return {
      hasProgressItems: true,
      total: children.length,
      completed: summaries.filter((summary) => summary.percent === 100).length,
      percent,
      label: `项目进度：${percent}%`,
      detail: `直属子项目平均 ${percent}%`,
      source: "children",
    };
  }
  const items = getProjectProgressItems(project);
  const total = items.length;
  if (total === 0) {
    return {
      hasProgressItems: false,
      total: 0,
      completed: 0,
      percent: null,
      label: "未拆分推进事项",
      detail: "未拆分推进事项",
      source: "none",
    };
  }

  const completed = items.filter((item) => item.status === "done").length;
  const percent = Math.round((completed / total) * 100);
  return {
    hasProgressItems: true,
    total,
    completed,
    percent,
    label: `项目进度：${percent}%`,
    detail: `已完成 ${completed} / ${total} 项`,
    source: "actions",
  };
}

export function getAverageProjectProgress(projects: Project[]): { average: number | null; counted: number } {
  const roots = projects.some((project) => project.parentId !== undefined) ? projects.filter((project) => !project.parentId) : projects;
  const summaries = roots.map((project) => getProjectProgressSummary(project, projects)).filter((summary) => summary.hasProgressItems && summary.percent !== null);
  if (summaries.length === 0) return { average: null, counted: 0 };
  const average = Math.round(summaries.reduce((sum, summary) => sum + (summary.percent || 0), 0) / summaries.length);
  return { average, counted: summaries.length };
}

export function getProjectComputedStatus(project: Project, projects: Project[] = []): ProjectStatus {
  const summary = getProjectProgressSummary(project, projects);
  if (summary.percent === null || summary.percent === 0) return "未开始";
  if (summary.percent >= 100) return "已完成";
  return "进行中";
}

function getProjectProgressItems(project: Pick<Project, "executionSteps">): ProjectStep[] {
  return Array.isArray(project.executionSteps) ? project.executionSteps : [];
}
