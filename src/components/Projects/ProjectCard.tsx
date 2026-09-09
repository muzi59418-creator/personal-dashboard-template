import { ArrowDown, ArrowUp } from "lucide-react";
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import type { Project } from "../../types/dashboard";
import { formatDateTime } from "../../utils/date";
import { getProjectProgressSummary } from "../../utils/projectProgress";
import { getProjectComputedStatus } from "../../utils/projectProgress";

interface ProjectCardProps {
  project: Project;
  onOpen?: () => void;
  sortIndex?: number;
  totalCount?: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  projects?: Project[];
}

export function ProjectCard({ project, onOpen, sortIndex, totalCount, onMoveUp, onMoveDown, projects = [] }: ProjectCardProps) {
  const canMoveUp = typeof sortIndex === "number" && sortIndex > 0 && Boolean(onMoveUp);
  const canMoveDown = typeof sortIndex === "number" && typeof totalCount === "number" && sortIndex < totalCount - 1 && Boolean(onMoveDown);
  const showSortActions = Boolean(onMoveUp || onMoveDown);
  const progressSummary = getProjectProgressSummary(project, projects);
  const computedStatus = getProjectComputedStatus(project, projects);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!onOpen) return;
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpen();
  }

  function stopCardOpen(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  function handleSortPointerDown(event: PointerEvent<HTMLButtonElement>, action: (() => void) | undefined, enabled: boolean) {
    event.stopPropagation();
    if (!enabled) return;
    event.preventDefault();
    action?.();
  }

  function handleSortKeyDown(event: KeyboardEvent<HTMLButtonElement>, action: (() => void) | undefined, enabled: boolean) {
    event.stopPropagation();
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (enabled) action?.();
  }

  return (
    <article
      className="project-card project-card-button project-card-compact"
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
    >
      <div className="project-compact-main">
        <div className="project-compact-title">
          <h3>{project.name}</h3>
          <div className="project-compact-meta">
            <strong>{progressSummary.hasProgressItems ? `${progressSummary.percent}%` : progressSummary.label}</strong>
            {progressSummary.hasProgressItems && (
              <>
                <span className="meta-separator">·</span>
                <span>{progressSummary.detail}</span>
              </>
            )}
            <span className="meta-separator">·</span>
            <span>更新 {formatDateTime(project.updatedAt)}</span>
          </div>
          <p className="project-next-action-preview">下一步：{project.nextAction || "暂未设置"}</p>
        </div>
        <div className="project-compact-side">
          <span className="chip status">{computedStatus}{project.isDelayed ? " · 延期" : ""}</span>
          {showSortActions && (
            <div className="project-sort-actions" aria-label="调整项目顺序">
              <button
                className="icon-button"
                type="button"
                aria-label={`上移 ${project.name}`}
                disabled={!canMoveUp}
                onClick={stopCardOpen}
                onPointerDown={(event) => handleSortPointerDown(event, onMoveUp, canMoveUp)}
                onKeyDown={(event) => handleSortKeyDown(event, onMoveUp, canMoveUp)}
              >
                <ArrowUp size={14} />
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label={`下移 ${project.name}`}
                disabled={!canMoveDown}
                onClick={stopCardOpen}
                onPointerDown={(event) => handleSortPointerDown(event, onMoveDown, canMoveDown)}
                onKeyDown={(event) => handleSortKeyDown(event, onMoveDown, canMoveDown)}
              >
                <ArrowDown size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
