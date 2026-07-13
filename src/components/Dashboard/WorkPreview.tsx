import { useState } from "react";
import type { Category, Project, ProjectInput, ProjectStep, ProjectStepStatus, WorkItem, WorkItemInput } from "../../types/dashboard";
import { PROJECT_STEP_STATUSES } from "../../types/dashboard";
import { formatDate, formatDateTime, todayInputValue } from "../../utils/date";
import { EmptyState } from "../Common/EmptyState";
import { Modal } from "../Common/Modal";
import { WorkStatusSelect } from "../WorkItems/WorkStatusSelect";
import { getProjectStepStatusLabel } from "../Projects/ProjectForm";

interface WorkPreviewProps {
  categories: Category[];
  items: WorkItem[];
  projects: Project[];
  onOpenWork: (workId: string) => void;
  onOpenProject: (projectId: string) => void;
  onUpdateWork: (id: string, input: WorkItemInput) => void;
  onUpdateProject: (id: string, input: ProjectInput) => void;
  onSkipRoutineWork?: (id: string, reason?: string) => void;
  onPostponeRoutineWork?: (id: string, targetDate: string) => void;
}

export function WorkPreview({ categories, items, projects, onOpenWork, onOpenProject, onUpdateWork, onUpdateProject, onSkipRoutineWork, onPostponeRoutineWork }: WorkPreviewProps) {
  const [showTodayAll, setShowTodayAll] = useState(false);
  const [showCompletedToday, setShowCompletedToday] = useState(false);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const today = todayInputValue();
  const priorityItems = getPriorityItems(items, today);
  const visiblePriorityItems = priorityItems.slice(0, 3);
  const todayRoutineItems = dedupeRoutineItems(items.filter((item) => isRoutineWork(item) && item.date === today)).sort(compareTodayWorkItems);
  const pendingRoutineItems = todayRoutineItems.filter((item) => isActionableStatus(item) && !item.routineSkipped);
  const completedTodayItems = getCompletedTodayItems(items, today);
  const projectActions = getProjectActions(projects, today);

  return (
    <>
      <section className="panel dashboard-equal-panel today-work-panel">
        <div className="section-head">
          <div>
            <h2>今日工作台</h2>
          </div>
          <div className="section-head-actions">
            <button className="text-button today-completed-link" type="button" onClick={() => setShowCompletedToday(true)}>
              今日已完成 {completedTodayItems.length} 条
            </button>
            {priorityItems.length > 3 && (
              <button className="text-button" type="button" onClick={() => setShowTodayAll(true)}>
                查看全部
              </button>
            )}
          </div>
        </div>

        <div className={`today-workbench-section${visiblePriorityItems.length === 0 ? " today-workbench-section-empty" : ""}`}>
          <div className="today-workbench-title">
            <h3>优先处理</h3>
            <span>最多显示 3 条</span>
          </div>
          {visiblePriorityItems.length === 0 ? (
            <p className="today-workbench-empty">暂无优先处理事项</p>
          ) : (
            <div className="today-work-list">
              {visiblePriorityItems.map((item, index) => (
                <TodayWorkRow
                  key={item.id}
                  item={item}
                  index={index}
                  sourceLabel={getPriorityLabel(item, today)}
                  categoryMap={categoryMap}
                  onOpenWork={onOpenWork}
                  onUpdateWork={onUpdateWork}
                  onSkipRoutineWork={onSkipRoutineWork}
                  onPostponeRoutineWork={onPostponeRoutineWork}
                />
              ))}
            </div>
          )}
        </div>

        <div className="today-workbench-section">
          <div className="today-workbench-title">
            <h3>今日例行</h3>
            <span>{pendingRoutineItems.length} 条</span>
          </div>
          {pendingRoutineItems.length === 0 ? (
            <div className="compact-empty-state today-routine-empty">
              <EmptyState title="今日暂无待处理的例行工作" description="" />
            </div>
          ) : (
            <div className="today-work-list">
              {pendingRoutineItems.map((item, index) => (
                <TodayWorkRow
                  key={item.id}
                  item={item}
                  index={index}
                  sourceLabel=""
                  showMetadata={false}
                  categoryMap={categoryMap}
                  onOpenWork={onOpenWork}
                  onUpdateWork={onUpdateWork}
                  onSkipRoutineWork={onSkipRoutineWork}
                  onPostponeRoutineWork={onPostponeRoutineWork}
                />
              ))}
            </div>
          )}
        </div>

        <div className={`today-workbench-section${projectActions.length === 0 ? " today-workbench-section-empty" : ""}`}>
          <div className="today-workbench-title">
            <h3>项目推进</h3>
            <span>{projectActions.length} 个</span>
          </div>
          {projectActions.length === 0 ? (
            <p className="today-workbench-empty">暂无待推进项目</p>
          ) : (
            <div className="project-action-list">
              {projectActions.map((action, index) => (
                <ProjectActionRow
                  key={`${action.projectId}-${action.itemId}`}
                  action={action}
                  index={index}
                  onOpenProject={onOpenProject}
                  onUpdateProject={onUpdateProject}
                />
              ))}
            </div>
          )}
        </div>
      </section>
      {showTodayAll && (
        <Modal title="全部优先处理" onClose={() => setShowTodayAll(false)}>
          {priorityItems.length === 0 ? (
            <EmptyState title="暂无优先处理事项" description="" />
          ) : (
            <div className="today-work-modal-list">
              {priorityItems.map((item, index) => (
                <div className="today-work-modal-row" key={item.id}>
                  <span className="today-work-index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <span className="chip outline">{getPriorityLabel(item, today)}</span>
                  </div>
                  <WorkStatusSelect item={item} onUpdate={onUpdateWork} />
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
      {showCompletedToday && (
        <Modal title={`今日已完成 ${completedTodayItems.length} 条`} onClose={() => setShowCompletedToday(false)}>
          {completedTodayItems.length === 0 ? (
            <EmptyState title="今天还没有完成记录" description="" />
          ) : (
            <div className="today-completed-modal-list">
              {completedTodayItems.map((item) => (
                <article className="today-completed-modal-row" key={item.id}>
                  <div>
                    <strong>{getCompletedDisplayTitle(item, categoryMap)}</strong>
                  </div>
                  <time>{formatDateTime(item.completedAt || item.updatedAt)}</time>
                </article>
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

interface TodayWorkRowProps {
  item: WorkItem;
  index: number;
  sourceLabel: string;
  showMetadata?: boolean;
  categoryMap: Map<string, Category>;
  onOpenWork: (workId: string) => void;
  onUpdateWork: (id: string, input: WorkItemInput) => void;
  onSkipRoutineWork?: (id: string, reason?: string) => void;
  onPostponeRoutineWork?: (id: string, targetDate: string) => void;
}

function TodayWorkRow({ item, index, sourceLabel, showMetadata = true, categoryMap, onOpenWork, onUpdateWork, onSkipRoutineWork, onPostponeRoutineWork }: TodayWorkRowProps) {
  const category = categoryMap.get(item.categoryId);
  const routine = isRoutineWork(item);
  return (
    <article
      className="today-work-row"
      role="button"
      tabIndex={0}
      onClick={() => onOpenWork(item.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenWork(item.id);
        }
      }}
    >
      <span className="today-work-index" aria-hidden="true">
        {index + 1}
      </span>
      <div className="today-work-main">
        <div className="today-work-title-line">
          <strong>{item.title}</strong>
          {showMetadata && <span className="today-work-due">截止 {formatDate(item.date)}</span>}
          {showMetadata && sourceLabel && <span className="today-work-source">{sourceLabel}</span>}
          {showMetadata && !sourceLabel && category && <span className="today-work-source">{category.name}</span>}
        </div>
      </div>
      <WorkStatusSelect
        item={item}
        onUpdate={onUpdateWork}
        onSkipRoutineWork={routine ? onSkipRoutineWork : undefined}
        onPostponeRoutineWork={routine ? onPostponeRoutineWork : undefined}
      />
    </article>
  );
}

interface ProjectAction {
  project: Project;
  projectId: string;
  itemId: string;
  name: string;
  dueDate: string;
  status: ProjectStepStatus;
}

function ProjectActionRow({
  action,
  index,
  onOpenProject,
  onUpdateProject,
}: {
  action: ProjectAction;
  index: number;
  onOpenProject: (projectId: string) => void;
  onUpdateProject: (id: string, input: ProjectInput) => void;
}) {
  function updateProjectStepStatus(status: ProjectStepStatus) {
    if (status === action.status) return;
    onUpdateProject(action.projectId, {
      ...toProjectInput(action.project),
      executionSteps: (action.project.executionSteps || []).map((step) =>
        step.id === action.itemId
          ? {
              ...step,
              status,
              completedAt: status === "done" ? step.completedAt || todayInputValue() : "",
            }
          : step,
      ),
    });
  }

  return (
    <article
      className="today-work-row project-action-row"
      role="button"
      tabIndex={0}
      onClick={() => onOpenProject(action.projectId)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenProject(action.projectId);
        }
      }}
    >
      <span className="today-work-index" aria-hidden="true">
        {index + 1}
      </span>
      <div className="today-work-main">
        <div className="today-work-title-line">
          <strong>{action.name}</strong>
          <span className="today-work-due">截止 {formatDate(action.dueDate)}</span>
        </div>
      </div>
      <label
        className="chip status quick-select-chip"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
      >
        <span className="sr-only">推进事项状态</span>
        <select value={action.status} onChange={(event) => updateProjectStepStatus(event.target.value as ProjectStepStatus)}>
          {PROJECT_STEP_STATUSES.map((status) => (
            <option key={status} value={status}>
              {getProjectStepStatusLabel(status)}
            </option>
          ))}
        </select>
      </label>
    </article>
  );
}

function compareTodayWorkItems(a: WorkItem, b: WorkItem): number {
  const timeCompare = (a.createdAt || "").localeCompare(b.createdAt || "");
  if (timeCompare !== 0) return timeCompare;
  return a.id.localeCompare(b.id);
}

function getPriorityItems(items: WorkItem[], today: string): WorkItem[] {
  const seen = new Set<string>();
  return items
    .filter((item) => !isRoutineWork(item) && isActionableStatus(item))
    .filter((item) => item.date < today || item.date === today || item.plannedDate === today)
    .sort((a, b) => getPriorityRank(a, today) - getPriorityRank(b, today) || compareTodayWorkItems(a, b))
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
}

function getPriorityRank(item: WorkItem, today: string): number {
  if (item.date < today) return 1;
  if (item.date === today) return 2;
  if (item.plannedDate === today) return 3;
  return 4;
}

function getPriorityLabel(item: WorkItem, today: string): string {
  if (item.date < today) return "已逾期";
  if (item.date === today) return "今日截止";
  return "今日计划";
}

function isRoutineWork(item: WorkItem): boolean {
  return item.sourceTemplateType === "routine" || Boolean(item.sourceTemplateId && item.sourceTemplateType !== "work");
}

function dedupeRoutineItems(items: WorkItem[]): WorkItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.routineRuleId || item.sourceTemplateId || item.id}:${item.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isActionableStatus(item: WorkItem): boolean {
  return item.status === "待处理" || item.status === "进行中";
}

function getCompletedTodayItems(items: WorkItem[], today: string): WorkItem[] {
  return items
    .filter((item) => item.status === "已完成")
    .filter((item) => getLocalDatePart(item.completedAt || item.updatedAt) === today)
    .sort((a, b) => (b.completedAt || b.updatedAt || "").localeCompare(a.completedAt || a.updatedAt || ""));
}

function getLocalDatePart(value: string | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getProjectActions(projects: Project[], today: string): ProjectAction[] {
  return projects
    .flatMap((project) =>
      (project.executionSteps || [])
        .filter((step) => step.status !== "done")
        .filter((step) => getProjectStepPlanDate(step) === today)
        .map((step) => ({
          project,
          projectId: project.id,
          itemId: step.id,
          name: step.name || "未命名推进事项",
          dueDate: getProjectStepPlanDate(step),
          status: step.status,
        })),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
    .slice(0, 6);
}

function getProjectStepPlanDate(step: ProjectStep): string {
  const value = step as typeof step & {
    plannedDate?: string;
    planDate?: string;
    scheduledDate?: string;
    executionDate?: string;
    date?: string;
  };
  return value.plannedDate || value.planDate || value.scheduledDate || value.executionDate || value.date || value.dueDate || "";
}

function getCompletedTypeLabel(item: WorkItem, categoryMap: Map<string, Category>): string {
  if (isRoutineWork(item)) return item.sourceTemplateName ? `例行工作 / ${item.sourceTemplateName}` : "例行工作";
  const category = categoryMap.get(item.categoryId);
  if (item.sourceProjectType === "progressItem") return "项目推进";
  return category?.name || "工作内容";
}

function getCompletedDisplayTitle(item: WorkItem, categoryMap: Map<string, Category>): string {
  const sourceLabel = getCompletedTypeLabel(item, categoryMap);
  if (sourceLabel.includes(" / ")) return sourceLabel;
  return `${sourceLabel} / ${item.title}`;
}

function toProjectInput(project: Project): ProjectInput {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = project;
  return input;
}
