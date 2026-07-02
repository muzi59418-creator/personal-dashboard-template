import type { Project } from "../../types/dashboard";
import { EmptyState } from "../Common/EmptyState";

interface ProjectOverviewProps {
  projects: Project[];
}

export function ProjectOverview({ projects }: ProjectOverviewProps) {
  const workProjects = sortProjectsByUpdatedAt(projects.filter((project) => project.type === "work"));
  const personalProjects = sortProjectsByUpdatedAt(projects.filter((project) => project.type === "personal"));

  return (
    <section className="wide-panel">
      <div className="project-overview-columns">
        <ProjectOverviewGroup title="工作项目看板" emptyTitle="暂无工作项目" projects={workProjects} />
        <ProjectOverviewGroup title="个人项目看板" emptyTitle="暂无个人项目" projects={personalProjects} />
      </div>
    </section>
  );
}

interface ProjectOverviewGroupProps {
  title: string;
  emptyTitle: string;
  projects: Project[];
}

function ProjectOverviewGroup({ title, emptyTitle, projects }: ProjectOverviewGroupProps) {
  const stats = getProjectStats(projects);
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
            aria-label={`${title}平均进度 ${stats.averageProgress}%`}
          >
            <div className="completion-donut-center">
              <strong>{stats.averageProgress}%</strong>
              <span>平均进度</span>
            </div>
          </div>
          <div className="project-status-legend" aria-label={`${title}状态分布`}>
            <StatusLegend color="#64748b" label="未开始" />
            <StatusLegend color="#2563eb" label="进行中" />
            <StatusLegend color="#0f766e" label="已完成" />
            {stats.other > 0 && <StatusLegend color="#94a3b8" label="其他" />}
          </div>
        </div>

        <div className="completion-stat-grid project-stat-grid">
          <CompletionStat label="总项目" value={stats.total} />
          <CompletionStat label="未开始" value={stats.notStarted} />
          <CompletionStat label="进行中" value={stats.active} tone="active" />
          <CompletionStat label="已完成" value={stats.completed} tone="completed" />
        </div>

        {projects.length === 0 && (
          <EmptyState title={emptyTitle} description="创建对应类型的项目后，这里会显示项目概览。" />
        )}
      </div>
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

function StatusLegend({ color, label }: { color: string; label: string }) {
  return (
    <div className="project-status-legend-item">
      <span className="mini-dot" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

function getProjectStats(projects: Project[]) {
  const total = projects.length;
  const notStarted = projects.filter((project) => project.status === "未开始").length;
  const active = projects.filter((project) => project.status === "进行中").length;
  const completed = projects.filter((project) => project.status === "已完成").length;
  const averageProgress = total > 0 ? Math.round(projects.reduce((sum, project) => sum + clampProgress(project.progress), 0) / total) : 0;

  return {
    total,
    notStarted,
    active,
    completed,
    averageProgress,
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
    #0f766e ${activeEnd}% ${completedEnd}%,
    #94a3b8 ${completedEnd}% 100%
  )`;
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function sortProjectsByUpdatedAt(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => getProjectSortTime(b).localeCompare(getProjectSortTime(a)) || a.id.localeCompare(b.id));
}

function getProjectSortTime(project: Project): string {
  return project.updatedAt || project.createdAt || "";
}
