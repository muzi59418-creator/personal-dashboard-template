import type { Project, ProjectStep } from "../types/dashboard";

export interface ProjectProgressSummary {
  hasProgressItems: boolean;
  total: number;
  completed: number;
  percent: number | null;
  label: string;
  detail: string;
}

export function getProjectProgressSummary(project: Pick<Project, "executionSteps">): ProjectProgressSummary {
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
  };
}

export function getAverageProjectProgress(projects: Project[]): { average: number | null; counted: number } {
  const summaries = projects.map(getProjectProgressSummary).filter((summary) => summary.hasProgressItems && summary.percent !== null);
  if (summaries.length === 0) return { average: null, counted: 0 };
  const average = Math.round(summaries.reduce((sum, summary) => sum + (summary.percent || 0), 0) / summaries.length);
  return { average, counted: summaries.length };
}

function getProjectProgressItems(project: Pick<Project, "executionSteps">): ProjectStep[] {
  return Array.isArray(project.executionSteps) ? project.executionSteps : [];
}
