import type { Project } from "../../types/dashboard";
import { getAverageProjectProgress } from "../../utils/projectProgress";
import { getProjectComputedStatus } from "../../utils/projectProgress";
import { getRootProjects } from "../../utils/projectTree";
import { EmptyState } from "../Common/EmptyState";

interface ProjectOverviewProps {
  projects: Project[];
}

export function ProjectOverview({ projects }: ProjectOverviewProps) {
  const rootProjects = getRootProjects(projects);
  const workProjects = sortProjectsByUpdatedAt(rootProjects.filter((project) => project.type === "work"));
  const personalProjects = sortProjectsByUpdatedAt(rootProjects.filter((project) => project.type === "personal"));

  return (
    <section className="wide-panel">
      <div className="project-overview-stack">
        <ProjectOverviewGroup title="工作项目看板" emptyTitle="暂无工作项目" projects={workProjects} allProjects={projects} />
        <ProjectOverviewGroup title="个人项目看板" emptyTitle="暂无个人项目" projects={personalProjects} allProjects={projects} />
      </div>
    </section>
  );
}

interface ProjectOverviewGroupProps {
  title: string;
  emptyTitle: string;
  projects: Project[];
  allProjects: Project[];
}

function ProjectOverviewGroup({ title, emptyTitle, projects, allProjects }: ProjectOverviewGroupProps) {
  const stats = getProjectStats(projects, allProjects);
  const chartBackground = makeProjectChartBackground(stats);

  return (
    <section className="project-overview-group">
      <div className="project-overview-group-head">
        <h3>{title}</h3>
      </div>
      <div className="project-dashboard-main">
        <div className="project-dashboard-chart">
          <div
            className={`completion-donut project-status-donut ${stats.total === 0 ? "empty" : ""}`}
            style={{ background: chartBackground }}
            aria-label={stats.averageProgress === null ? `${title}未拆分推进事项` : `${title}平均进度 ${stats.averageProgress}%`}
          >
            <div className="completion-donut-center">
              <strong>{stats.averageProgress === null ? "未拆分" : `${stats.averageProgress}%`}</strong>
              <span>{stats.averageProgress === null ? "推进事项" : "平均进度"}</span>
            </div>
          </div>
        </div>

        <div className="completion-stat-grid project-stat-grid">
          <CompletionStat label="总项目" value={stats.total} />
          <CompletionStat label="未开始" value={stats.notStarted} />
          <CompletionStat label="进行中" value={stats.active} tone="active" />
          <CompletionStat label="已完成" value={stats.completed} tone="completed" />
        </div>

        {projects.length === 0 && <EmptyState title={emptyTitle} description="创建对应类型的项目后，这里会显示项目概览。" />}
      </div>
      <p className="muted-text project-average-note">平均进度仅统计已拆分推进事项的项目</p>
    </section>
  );
}

function CompletionStat({ label, value, tone = "" }: { label: string; value: number; tone?: string }) {
  return (
    <div className={`completion-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getProjectStats(projects: Project[], allProjects: Project[]) {
  const total = projects.length;
  const notStarted = projects.filter((project) => getProjectComputedStatus(project, allProjects) === "未开始").length;
  const active = projects.filter((project) => getProjectComputedStatus(project, allProjects) === "进行中").length;
  const completed = projects.filter((project) => getProjectComputedStatus(project, allProjects) === "已完成").length;
  const progress = getAverageProjectProgress(allProjects.filter((project) => projects.some((root) => root.id === project.rootProjectId || root.id === project.id)));

  return {
    total,
    notStarted,
    active,
    completed,
    averageProgress: progress.average,
    progressCount: progress.counted,
    other: Math.max(0, total - notStarted - active - completed),
  };
}

function makeProjectChartBackground(stats: ReturnType<typeof getProjectStats>) {
  if (stats.total === 0) return "#e2e8f0";

  const notStartedEnd = (stats.notStarted / stats.total) * 100;
  const activeEnd = notStartedEnd + (stats.active / stats.total) * 100;
  const completedEnd = activeEnd + (stats.completed / stats.total) * 100;

  return `conic-gradient(
    #64748b 0% ${notStartedEnd}%,
    #2563eb ${notStartedEnd}% ${activeEnd}%,
    #14b8a6 ${activeEnd}% ${completedEnd}%,
    #94a3b8 ${completedEnd}% 100%
  )`;
}

function sortProjectsByUpdatedAt(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => getProjectSortTime(b).localeCompare(getProjectSortTime(a)) || a.id.localeCompare(b.id));
}

function getProjectSortTime(project: Project): string {
  return project.updatedAt || project.createdAt || "";
}
