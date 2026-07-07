import { useState } from "react";
import type { Category, Project, WorkItem, WorkItemInput } from "../../types/dashboard";
import { formatDate, formatDateTime, todayInputValue } from "../../utils/date";
import { EmptyState } from "../Common/EmptyState";
import { Modal } from "../Common/Modal";
import { WorkStatusSelect } from "../WorkItems/WorkStatusSelect";

interface WorkPreviewProps {
  categories: Category[];
  items: WorkItem[];
  projects: Project[];
  onOpenWork: (workId: string) => void;
  onOpenProject: (projectId: string) => void;
  onUpdateWork: (id: string, input: WorkItemInput) => void;
  onSkipRoutineWork?: (id: string, reason?: string) => void;
  onPostponeRoutineWork?: (id: string, targetDate: string) => void;
}

export function WorkPreview({ categories, items, projects, onOpenWork, onOpenProject, onUpdateWork, onSkipRoutineWork, onPostponeRoutineWork }: WorkPreviewProps) {
  const [showTodayAll, setShowTodayAll] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const today = todayInputValue();
  const priorityItems = getPriorityItems(items, today);
  const visiblePriorityItems = priorityItems.slice(0, 3);
  const todayRoutineItems = dedupeRoutineItems(items.filter((item) => isRoutineWork(item) && item.date === today)).sort(compareTodayWorkItems);
  const pendingRoutineItems = todayRoutineItems.filter((item) => item.status !== "已完成" && item.status !== "已跳过");
  const completedTodayItems = getCompletedTodayItems(items, today);
  const projectActions = getProjectActions(projects);
  const pendingCount = priorityItems.length + pendingRoutineItems.length;

  return (
    <>
      <section className="panel dashboard-equal-panel today-work-panel">
        <div className="section-head">
          <div>
            <h2>今日工作台</h2>
          </div>
          {priorityItems.length > 3 && (
            <button className="text-button" type="button" onClick={() => setShowTodayAll(true)}>
              查看全部
            </button>
          )}
        </div>

        {pendingCount === 0 && (
          <div className="today-clear-banner">
            <strong>今天的待办已清空</strong>
            <span>今日已完成 {completedTodayItems.length} 条</span>
          </div>
        )}

        <div className="today-workbench-section">
          <div className="today-workbench-title">
            <h3>优先处理</h3>
            <span>最多显示 3 条</span>
          </div>
          {visiblePriorityItems.length === 0 ? (
            <EmptyState title="暂无优先处理事项" description="" />
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
            <span>{todayRoutineItems.length} 条</span>
          </div>
          {todayRoutineItems.length === 0 ? (
            <EmptyState title="今日暂无自动生成的例行工作" description="" />
          ) : (
            <div className="today-work-list">
              {todayRoutineItems.map((item, index) => (
                <TodayWorkRow
                  key={item.id}
                  item={item}
                  index={index}
                  sourceLabel="今日例行"
                  categoryMap={categoryMap}
                  onOpenWork={onOpenWork}
                  onUpdateWork={onUpdateWork}
                />
              ))}
            </div>
          )}
        </div>

        <div className="today-workbench-section">
          <div className="today-workbench-title">
            <h3>项目推进</h3>
            <span>{projectActions.length} 个</span>
          </div>
          {projectActions.length === 0 ? (
            <EmptyState title="暂无项目下一步动作" description="" />
          ) : (
            <div className="project-action-list">
              {projectActions.map((project) => (
                <button className="project-action-row" type="button" key={project.id} onClick={() => onOpenProject(project.id)}>
                  <strong>{project.name}</strong>
                  <span>{getProjectNextAction(project)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="today-workbench-section">
          <button className="today-completed-toggle" type="button" onClick={() => setCompletedExpanded((current) => !current)}>
            <span>今日已完成</span>
            <strong>{completedTodayItems.length} 条</strong>
          </button>
          {completedExpanded && (
            completedTodayItems.length === 0 ? (
              <EmptyState title="今天还没有完成记录" description="" />
            ) : (
              <div className="today-work-list">
                {completedTodayItems.map((item, index) => (
                  <TodayWorkRow
                    key={item.id}
                    item={item}
                    index={index}
                    sourceLabel="已完成"
                    categoryMap={categoryMap}
                    onOpenWork={onOpenWork}
                    onUpdateWork={onUpdateWork}
                  />
                ))}
              </div>
            )
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
    </>
  );
}

interface TodayWorkRowProps {
  item: WorkItem;
  index: number;
  sourceLabel: string;
  categoryMap: Map<string, Category>;
  onOpenWork: (workId: string) => void;
  onUpdateWork: (id: string, input: WorkItemInput) => void;
  onSkipRoutineWork?: (id: string, reason?: string) => void;
  onPostponeRoutineWork?: (id: string, targetDate: string) => void;
}

function TodayWorkRow({ item, index, sourceLabel, categoryMap, onOpenWork, onUpdateWork, onSkipRoutineWork, onPostponeRoutineWork }: TodayWorkRowProps) {
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
        <strong>{item.title}</strong>
        <div className="today-work-meta">
          <span className="chip outline">{sourceLabel}</span>
          {category && (
            <span>
              <span className="mini-dot" style={{ background: category.color }} />
              {category.name}
            </span>
          )}
          <span>截止 {formatDate(item.date)}</span>
          {item.plannedDate && <span>计划 {formatDate(item.plannedDate)}</span>}
          {routine && item.routineHolidayPostponed && <span>因节假日顺延</span>}
          {routine && item.routineManualPostponed && <span>手动顺延</span>}
          {routine && item.routineOriginalDate && item.routineOriginalDate !== item.date && <span>原定 {formatDate(item.routineOriginalDate)}</span>}
          <span>更新 {formatDateTime(item.updatedAt || item.createdAt)}</span>
        </div>
      </div>
      {routine && (
        <div className="today-routine-actions" onClick={(event) => event.stopPropagation()}>
          <button className="text-button" type="button" onClick={() => onPostponeRoutineWork?.(item.id, getTomorrow(item.date))}>
            明天
          </button>
          <button className="text-button" type="button" onClick={() => onSkipRoutineWork?.(item.id)}>
            跳过
          </button>
        </div>
      )}
      <WorkStatusSelect item={item} onUpdate={onUpdateWork} />
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
    .filter((item) => !isRoutineWork(item) && item.status !== "已完成")
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

function getTomorrow(date: string): string {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + 1);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
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

function getProjectActions(projects: Project[]): Project[] {
  return projects
    .filter((project) => project.status === "进行中")
    .filter((project) => Boolean(getProjectNextAction(project)))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "") || a.id.localeCompare(b.id))
    .slice(0, 4);
}

function getProjectNextAction(project: Project): string {
  const activeStep = project.executionSteps?.find((step) => step.status !== "done");
  return project.nextAction || activeStep?.name || "";
}
