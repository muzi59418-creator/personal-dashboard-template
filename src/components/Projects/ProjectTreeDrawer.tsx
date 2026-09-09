import { Check, ChevronRight, Edit3, MoreVertical, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Project, ProjectStep } from "../../types/dashboard";
import { formatDateTime } from "../../utils/date";
import { getProjectComputedStatus, getProjectProgressSummary } from "../../utils/projectProgress";
import { getProjectChildren, getProjectDepth, getProjectPath } from "../../utils/projectTree";

interface ProjectTreeDrawerProps {
  project: Project;
  projects: Project[];
  onClose: () => void;
  onSelectProject: (id: string) => void;
  onEditProject: (project: Project) => void;
  onAddChild: (project: Project) => void;
  onAddAction: (project: Project) => void;
  onEditAction: (project: Project, action: ProjectStep) => void;
  onMoveProject: (project: Project) => void;
  onMoveAction: (project: Project, action: ProjectStep) => void;
  onDeleteProject: (project: Project) => void;
  onDeleteAction: (project: Project, action: ProjectStep) => void;
  onToggleAction: (project: Project, action: ProjectStep) => void;
}

export function ProjectTreeDrawer({
  project,
  projects,
  onClose,
  onSelectProject,
  onEditProject,
  onAddChild,
  onAddAction,
  onEditAction,
  onMoveProject,
  onMoveAction,
  onDeleteProject,
  onDeleteAction,
  onToggleAction,
}: ProjectTreeDrawerProps) {
  const [activeTab, setActiveTab] = useState<"children" | "actions">(getProjectDepth(project, projects) >= 5 ? "actions" : "children");
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const children = getProjectChildren(projects, project.id);
  const actions = project.executionSteps || [];
  const depth = getProjectDepth(project, projects);
  const progress = getProjectProgressSummary(project, projects);
  const status = getProjectComputedStatus(project, projects);
  const path = getProjectPath(project, projects);
  const notes = project.note || project.retrospective || project.description || "";

  useEffect(() => {
    setActiveTab(depth >= 5 ? "actions" : "children");
    setProjectMenuOpen(false);
    setOpenActionMenu(null);
  }, [project.id, depth]);

  useEffect(() => {
    function closeMenus(event: MouseEvent) {
      if (!(event.target instanceof Element) || !event.target.closest(".project-drawer-menu-wrap")) {
        setProjectMenuOpen(false);
        setOpenActionMenu(null);
      }
    }
    document.addEventListener("mousedown", closeMenus);
    return () => document.removeEventListener("mousedown", closeMenus);
  }, []);

  return (
    <div className="project-drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="project-tree-drawer" role="dialog" aria-modal="true" aria-label={`${project.name} 项目详情`} onMouseDown={(event) => event.stopPropagation()}>
        <header className="project-tree-drawer-header">
          <div className="project-tree-drawer-topline">
            <div className="project-tree-drawer-title">
              <div className="project-path" aria-label="项目路径">
                {path.map((item, index) => (
                  <span key={item.id} className="project-path-item">
                    {index > 0 && <ChevronRight size={13} />}
                    <button type="button" onClick={() => onSelectProject(item.id)}>{item.name}</button>
                  </span>
                ))}
              </div>
              <h2>{project.name}</h2>
              <div className="project-tree-drawer-summary">
                <span className="project-status-text">{status}</span>
                {project.isDelayed && <span>· 延期</span>}
                <span>·</span>
                <span>{progress.percent === null ? "进度 —" : `进度 ${progress.percent}%`}</span>
              </div>
            </div>
            <div className="project-drawer-menu-wrap">
              <button className="icon-button" type="button" aria-label="项目操作" onClick={() => setProjectMenuOpen((current) => !current)}>
                <MoreVertical size={18} />
              </button>
              {projectMenuOpen && (
                <div className="project-drawer-menu" role="menu">
                  {depth < 5 && <button type="button" onClick={() => onAddChild(project)}><Plus size={15} />新增子项目</button>}
                  <button type="button" onClick={() => onAddAction(project)}><Plus size={15} />新增推进事项</button>
                  <button type="button" onClick={() => onEditProject(project)}><Edit3 size={15} />编辑</button>
                  <button type="button" onClick={() => onMoveProject(project)}><ChevronRight size={15} />移动</button>
                  <button className="danger-menu-item" type="button" onClick={() => onDeleteProject(project)}><Trash2 size={15} />删除</button>
                </div>
              )}
            </div>
            <button className="icon-button" type="button" aria-label="关闭项目详情" onClick={onClose}><X size={18} /></button>
          </div>
        </header>

        <div className="project-tree-drawer-body">
          <section className="project-drawer-next-action">
            <div className="project-drawer-section-kicker">下一步</div>
            <div className="project-next-action-line">
              <p className={!project.nextAction ? "empty-content-text" : undefined}>{project.nextAction || "暂未设置"}</p>
              <button className="text-button compact-text-button" type="button" onClick={() => onEditProject(project)}>{project.nextAction ? "编辑" : "设置下一步"}</button>
            </div>
          </section>

          {depth < 5 && (
            <div className="project-drawer-tabs" role="tablist" aria-label="项目内容">
              <button className={activeTab === "children" ? "active" : ""} type="button" role="tab" aria-selected={activeTab === "children"} onClick={() => setActiveTab("children")}>子项目 {children.length}</button>
              <button className={activeTab === "actions" ? "active" : ""} type="button" role="tab" aria-selected={activeTab === "actions"} onClick={() => setActiveTab("actions")}>推进事项 {actions.length}</button>
            </div>
          )}

          {activeTab === "children" && depth < 5 ? (
            <section className="project-drawer-content-section">
              <div className="project-drawer-section-head"><h3>子项目</h3><span>{children.length} 个</span></div>
              {children.length === 0 ? (
                <div className="project-drawer-empty"><p>暂无子项目</p><button className="secondary-button compact-button" type="button" onClick={() => onAddChild(project)}><Plus size={15} />新增子项目</button></div>
              ) : (
                <div className="project-drawer-child-list">
                  {children.map((child) => {
                    const childProgress = getProjectProgressSummary(child, projects);
                    return <button className="project-drawer-child-row" type="button" key={child.id} onClick={() => onSelectProject(child.id)}>
                      <span className="project-drawer-child-main"><strong>{child.name}</strong><small>{getProjectComputedStatus(child, projects)}{child.isDelayed ? " · 延期" : ""}</small></span>
                      <span className="project-drawer-child-meta">{childProgress.percent === null ? "—" : `${childProgress.percent}%`}<ChevronRight size={15} /></span>
                    </button>;
                  })}
                </div>
              )}
            </section>
          ) : (
            <section className="project-drawer-content-section">
              <div className="project-drawer-section-head"><h3>推进事项</h3><span>{actions.filter((action) => action.status === "done").length} / {actions.length}</span></div>
              {actions.length === 0 ? (
                <div className="project-drawer-empty"><p>暂无推进事项</p><button className="secondary-button compact-button" type="button" onClick={() => onAddAction(project)}><Plus size={15} />新增推进事项</button></div>
              ) : (
                <div className="project-drawer-action-list">
                  {actions.map((action) => (
                    <article className={`project-drawer-action-row${action.status === "done" ? " done" : ""}`} key={action.id}>
                      <button className="project-action-check" type="button" aria-label={action.status === "done" ? `取消完成 ${action.name}` : `完成 ${action.name}`} onClick={() => onToggleAction(project, action)}>
                        {action.status === "done" && <Check size={14} />}
                      </button>
                      <div className="project-drawer-action-main"><strong>{action.name || "未命名推进事项"}</strong>{action.description && <p>{action.description}</p>}{action.dueDate && <small>截止 {action.dueDate}</small>}</div>
                      <div className="project-drawer-menu-wrap">
                        <button className="icon-button" type="button" aria-label={`${action.name} 操作`} onClick={() => setOpenActionMenu((current) => current === action.id ? null : action.id)}><MoreVertical size={16} /></button>
                        {openActionMenu === action.id && <div className="project-drawer-menu project-action-menu" role="menu"><button type="button" onClick={() => onEditAction(project, action)}><Edit3 size={15} />编辑</button><button type="button" onClick={() => onMoveAction(project, action)}><ChevronRight size={15} />移动</button><button className="danger-menu-item" type="button" onClick={() => onDeleteAction(project, action)}><Trash2 size={15} />删除</button></div>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="project-drawer-note-section">
            <div className="project-drawer-section-head"><h3>备注</h3><button className="text-button compact-text-button" type="button" onClick={() => onEditProject(project)}>编辑</button></div>
            <p className={!notes ? "empty-content-text" : undefined}>{notes || "暂未添加备注"}</p>
          </section>
          <div className="project-drawer-time">创建于 {formatDateTime(project.createdAt)} · 更新于 {formatDateTime(project.updatedAt)}</div>
        </div>
      </aside>
    </div>
  );
}

