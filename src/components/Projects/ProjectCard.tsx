import { ArrowDown, ArrowUp } from "lucide-react";
import type { KeyboardEvent, MouseEvent, PointerEvent, SyntheticEvent } from "react";
import type { Project, ProjectStatus } from "../../types/dashboard";
import { PROJECT_STATUSES } from "../../types/dashboard";
import { formatDateTime } from "../../utils/date";

interface ProjectCardProps {
  project: Project;
  onOpen?: () => void;
  sortIndex?: number;
  totalCount?: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onStatusChange?: (status: ProjectStatus) => void;
}

export function ProjectCard({ project, onOpen, sortIndex, totalCount, onMoveUp, onMoveDown, onStatusChange }: ProjectCardProps) {
  const canMoveUp = typeof sortIndex === "number" && sortIndex > 0 && Boolean(onMoveUp);
  const canMoveDown = typeof sortIndex === "number" && typeof totalCount === "number" && sortIndex < totalCount - 1 && Boolean(onMoveDown);
  const showSortActions = Boolean(onMoveUp || onMoveDown);

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

  function stopStatusOpen(event: SyntheticEvent<HTMLSpanElement | HTMLSelectElement>) {
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
            <strong>{project.progress}%</strong>
            <span className="meta-separator">·</span>
            <span>更新 {formatDateTime(project.updatedAt)}</span>
          </div>
        </div>
        <div className="project-compact-side">
          <span
            className="chip status project-status-select-shell"
            onClick={stopStatusOpen}
            onKeyDown={stopStatusOpen}
            onMouseDown={stopStatusOpen}
            onPointerDown={stopStatusOpen}
            onTouchStart={stopStatusOpen}
          >
            <select
              className="status-select-control project-status-select"
              value={project.status}
              aria-label={`修改 ${project.name} 的状态`}
              onClick={stopStatusOpen}
              onKeyDown={stopStatusOpen}
              onChange={(event) => {
                event.stopPropagation();
                onStatusChange?.(event.target.value as ProjectStatus);
              }}
            >
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </span>
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
