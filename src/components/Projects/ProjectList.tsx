import { ChevronDown, ChevronRight, GripVertical, MoreVertical, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import type { Category, DiaryEntry, DiaryEntryInput, Idea, IdeaInput, Project, ProjectInput, ProjectQuadrant, ProjectStep, WorkItem, WorkItemInput } from "../../types/dashboard";
import { PROJECT_QUADRANTS } from "../../types/dashboard";
import { EmptyState } from "../Common/EmptyState";
import { ConfirmDialog } from "../Common/ConfirmDialog";
import { Modal } from "../Common/Modal";
import { ProjectActionForm, type ProjectActionInput } from "./ProjectActionForm";
import { ProjectNodeForm } from "./ProjectNodeForm";
import { ProjectTreeDrawer } from "./ProjectTreeDrawer";
import {
  canMoveProject,
  compareProjectOrder,
  getEffectiveProjectQuadrant,
  getProjectChildren,
  getProjectDescendantIds,
  getProjectDropPosition,
  getProjectNumber,
  getProjectPath,
  getRootProject,
  getRootProjects,
  type ProjectDropPosition,
  type ProjectMovePosition,
} from "../../utils/projectTree";
import { getProjectProgressSummary } from "../../utils/projectProgress";
import { getProjectComputedStatus } from "../../utils/projectProgress";

interface ProjectListProps {
  projects: Project[];
  workItems: WorkItem[];
  diaryEntries: DiaryEntry[];
  ideas: Idea[];
  categories: Category[];
  onCreate: (input: ProjectInput) => void;
  onUpdate: (id: string, input: ProjectInput) => void;
  onDelete: (id: string) => void;
  onCreateWork: (input: WorkItemInput) => void;
  onReorderProjects: (projectIds: string[]) => void;
  onUpdateWork: (id: string, input: WorkItemInput) => void;
  onDeleteWork: (id: string) => void;
  onUpdateDiary: (id: string, input: DiaryEntryInput) => void;
  onDeleteDiary: (id: string) => void;
  onUpdateIdea: (id: string, input: IdeaInput) => void;
  onDeleteIdea: (id: string) => void;
  onConvertIdeaToWork: (id: string, input: WorkItemInput) => void;
  onConvertIdeaToDiary: (id: string, input: DiaryEntryInput) => void;
  onCreateAction: (projectId: string, input: ProjectActionInput) => void;
  onUpdateAction: (projectId: string, actionId: string, input: ProjectActionInput) => void;
  onDeleteAction: (projectId: string, actionId: string) => void;
  onMoveAction: (sourceProjectId: string, actionId: string, targetProjectId: string) => void;
  onMoveProject: (projectId: string, targetParentId: string | null, position: ProjectMovePosition, referenceProjectId?: string) => void;
  onMoveToQuadrant: (projectId: string, quadrant: ProjectQuadrant) => void;
}

type ProjectFormState = { project?: Project; parent?: Project | null };
type ActionFormState = { project: Project; action?: ProjectStep };

const quadrantLabels: Record<ProjectQuadrant, string> = {
  important_urgent: "重要且紧急",
  important_not_urgent: "重要但不紧急",
  urgent_not_important: "紧急但不重要",
  not_important_not_urgent: "不重要且不紧急",
};

export function ProjectList(props: ProjectListProps) {
  const { projects, onCreate, onUpdate, onDelete, onCreateAction, onUpdateAction, onDeleteAction, onMoveAction, onMoveProject, onMoveToQuadrant } = props;
  const [projectForm, setProjectForm] = useState<ProjectFormState | null>(null);
  const [actionForm, setActionForm] = useState<ActionFormState | null>(null);
  const [movingProject, setMovingProject] = useState<Project | null>(null);
  const [movingAction, setMovingAction] = useState<{ project: Project; action: ProjectStep } | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [collapsedQuadrants, setCollapsedQuadrants] = useState<Set<ProjectQuadrant>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggedProjectId, setDraggedProjectId] = useState("");
  const [dropTarget, setDropTarget] = useState<{ projectId: string; position: ProjectDropPosition } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const selectedProject = projects.find((project) => project.id === selectedProjectId) || null;
  const roots = getRootProjects(projects);

  useEffect(() => {
    if (selectedProjectId && !selectedProject) setSelectedProjectId("");
  }, [selectedProject, selectedProjectId]);

  useEffect(() => {
    setExpandedIds((current) => {
      if (current.size > 0) return new Set([...current].filter((id) => projects.some((project) => project.id === id)));
      return new Set(roots.filter((project) => getProjectChildren(projects, project.id).length > 0).map((project) => project.id));
    });
  }, [projects.length]);

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredRoots = useMemo(() => roots.filter((root) => {
    return !normalizedSearch || collectSubtree(root, projects).some((project) => project.name.toLocaleLowerCase().includes(normalizedSearch));
  }), [normalizedSearch, projects, roots]);

  function toggleExpanded(projectId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  function setQuadrantCollapsed(quadrant: ProjectQuadrant) {
    setCollapsedQuadrants((current) => {
      const next = new Set(current);
      if (next.has(quadrant)) next.delete(quadrant);
      else next.add(quadrant);
      return next;
    });
  }

  function handleDrop(target: Project, dropPosition: ProjectDropPosition, event?: DragEvent<HTMLElement>) {
    const sourceId = event?.dataTransfer.getData("text/plain") || draggedProjectId;
    if (!sourceId || sourceId === target.id) return;
    const targetParentId = dropPosition === "inside" ? target.id : target.parentId || null;
    const movePosition: ProjectMovePosition = dropPosition === "inside" ? "last" : dropPosition;
    const referenceProjectId = dropPosition === "inside" ? undefined : target.id;
    const validation = canMoveProject(sourceId, targetParentId, projects);
    setDropTarget(null);
    setDraggedProjectId("");
    if (!validation.ok) {
      window.alert(validation.reason || "不能移动到当前目标。");
      return;
    }
    onMoveProject(sourceId, targetParentId, movePosition, referenceProjectId);
  }

  function updateDropTarget(event: DragEvent<HTMLElement>, target: Project) {
    const sourceId = event.dataTransfer.getData("text/plain") || draggedProjectId;
    if (!sourceId || sourceId === target.id) {
      setDropTarget(null);
      return;
    }
    const row = event.currentTarget.getBoundingClientRect();
    const position = getProjectDropPosition(event.clientY - row.top, row.height);
    const targetParentId = position === "inside" ? target.id : target.parentId || null;
    const validation = canMoveProject(sourceId, targetParentId, projects);
    event.dataTransfer.dropEffect = validation.ok ? "move" : "none";
    setDropTarget(validation.ok ? { projectId: target.id, position } : null);
  }

  function handleDeleteProject(project: Project) {
    setDeleteTarget(project);
  }

  function confirmDeleteProject() {
    if (!deleteTarget) return;
    onDelete(deleteTarget.id);
    setSelectedProjectId("");
    setDeleteTarget(null);
  }

  function handleDeleteAction(project: Project, action: ProjectStep) {
    if (!window.confirm(`确定删除推进事项「${action.name}」？`)) return;
    onDeleteAction(project.id, action.id);
  }

  const total = roots.length;
  const statusCounts = {
    "未开始": roots.filter((project) => getProjectComputedStatus(project, projects) === "未开始").length,
    "进行中": roots.filter((project) => getProjectComputedStatus(project, projects) === "进行中").length,
    "已完成": roots.filter((project) => getProjectComputedStatus(project, projects) === "已完成").length,
  };
  const delayedCount = roots.filter((project) => project.isDelayed === true).length;

  return (
    <section className="page-section project-management-page">
      <div className="page-head">
        <div><h2>项目管理</h2><p className="page-subtitle">用项目结构拆解目标，用推进事项记录下一步动作</p></div>
        <button className="primary-button" type="button" onClick={() => setProjectForm({ parent: null })}><Plus size={16} />新增项目</button>
      </div>

      <div className="project-stat-strip" aria-label="项目统计">
        <ProjectStat label="总项目" value={total} tone="blue" />
        <ProjectStat label="进行中" value={statusCounts["进行中"]} tone="teal" />
        <ProjectStat label="未开始" value={statusCounts["未开始"]} tone="slate" />
        <ProjectStat label="已完成" value={statusCounts["已完成"]} tone="green" />
        <ProjectStat label="延期" value={delayedCount} tone="amber" />
      </div>

      <div className="project-tree-toolbar">
        <label className="project-search-field"><Search size={16} /><span className="sr-only">搜索项目</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索项目名称 / 子项目" /></label>
      </div>

      {roots.length === 0 ? <EmptyState title="暂无项目" description="创建一个主项目后，这里会显示项目树。" /> : filteredRoots.length === 0 ? <EmptyState title="没有匹配的项目" description="试试调整搜索关键词。" /> : (
        <div className="project-quadrant-list" aria-label="项目四象限">
          {PROJECT_QUADRANTS.map((quadrant) => {
            const quadrantRoots = sortNodes(filteredRoots.filter((root) => getEffectiveProjectQuadrant(root, projects) === quadrant));
            const collapsed = collapsedQuadrants.has(quadrant);
            return <section className={`project-quadrant-section quadrant-section-${quadrant}`} key={quadrant} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); const sourceId = event.dataTransfer.getData("text/plain") || draggedProjectId; if (!sourceId) return; const dragged = projects.find((project) => project.id === sourceId); setDraggedProjectId(""); setDropTarget(null); if (dragged && !dragged.parentId) onMoveToQuadrant(dragged.id, quadrant); }}>
              <button className="project-quadrant-header" type="button" onClick={() => setQuadrantCollapsed(quadrant)} aria-expanded={!collapsed}>
                <span className="project-quadrant-heading"><span className="project-quadrant-dot" />{quadrantLabels[quadrant]}</span><span className="project-quadrant-count">{quadrantRoots.length} 个 {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</span>
              </button>
              {!collapsed && <div className="project-tree-list">{quadrantRoots.map((project) => renderProjectNode(project, 1))}</div>}
            </section>;
          })}
        </div>
      )}

      {selectedProject && <ProjectTreeDrawer project={selectedProject} projects={projects} onClose={() => setSelectedProjectId("")} onSelectProject={setSelectedProjectId} onEditProject={(project) => setProjectForm({ project, parent: project.parentId ? projects.find((item) => item.id === project.parentId) : undefined })} onAddChild={(project) => setProjectForm({ parent: project })} onAddAction={(project) => setActionForm({ project })} onEditAction={(project, action) => setActionForm({ project, action })} onMoveProject={setMovingProject} onMoveAction={(project, action) => setMovingAction({ project, action })} onDeleteProject={handleDeleteProject} onDeleteAction={handleDeleteAction} onToggleAction={(project, action) => onUpdateAction(project.id, action.id, { ...action, status: action.status === "done" ? "todo" : "done", completedAt: action.status === "done" ? "" : action.completedAt })} />}

      {projectForm && <Modal className="project-node-modal" title={getProjectFormTitle(projectForm)} onClose={() => setProjectForm(null)}><ProjectNodeForm project={projectForm.project} parent={projectForm.parent || undefined} onCancel={() => setProjectForm(null)} onSubmit={(input) => { if (projectForm.project) onUpdate(projectForm.project.id, input); else onCreate(input); setProjectForm(null); }} /></Modal>}
      {actionForm && <Modal title={actionForm.action ? "编辑推进事项" : "新增推进事项"} onClose={() => setActionForm(null)}><ProjectActionForm action={actionForm.action} onCancel={() => setActionForm(null)} onSubmit={(input) => { if (actionForm.action) onUpdateAction(actionForm.project.id, actionForm.action.id, input); else onCreateAction(actionForm.project.id, input); setActionForm(null); }} /></Modal>}
      {movingProject && <ProjectMoveModal project={movingProject} projects={projects} onCancel={() => setMovingProject(null)} onMoveProject={onMoveProject} onMoveToQuadrant={onMoveToQuadrant} />}
      {movingAction && <ProjectActionMoveModal project={movingAction.project} action={movingAction.action} projects={projects} onCancel={() => setMovingAction(null)} onMove={(targetId) => { onMoveAction(movingAction.project.id, movingAction.action.id, targetId); setMovingAction(null); }} />}
      {deleteTarget && <ConfirmDialog open title="确认删除项目？" description={buildProjectDeleteSummary(deleteTarget, projects)} confirmText="确认删除" onCancel={() => setDeleteTarget(null)} onConfirm={confirmDeleteProject} />}
    </section>
  );

  function renderProjectNode(project: Project, depth: number): ReactNode {
    const children = sortNodes(getProjectChildren(projects, project.id));
    const expanded = expandedIds.has(project.id) || Boolean(normalizedSearch && collectSubtree(project, projects).some((item) => item.name.toLocaleLowerCase().includes(normalizedSearch)));
    const progress = getProjectProgressSummary(project, projects);
    const status = getProjectComputedStatus(project, projects);
    return <div className="project-tree-branch" key={project.id}>
      <div className={`project-tree-row${dropTarget?.projectId === project.id ? ` drop-${dropTarget.position}` : ""}${selectedProjectId === project.id ? " selected" : ""}`} style={{ "--project-depth": depth } as CSSProperties} draggable onDragStart={(event) => { setDraggedProjectId(project.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", project.id); }} onDragEnd={() => { setDraggedProjectId(""); setDropTarget(null); }} onDragOver={(event) => { event.preventDefault(); updateDropTarget(event, project); }} onDragLeave={() => setDropTarget((current) => current?.projectId === project.id ? null : current)} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); const row = event.currentTarget.getBoundingClientRect(); const position = getProjectDropPosition(event.clientY - row.top, row.height); handleDrop(project, position, event); }} onClick={() => setSelectedProjectId(project.id)} onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) { event.preventDefault(); setSelectedProjectId(project.id); } }} role="button" tabIndex={0} aria-label={`${project.name}。拖到上方同级前插，中部放入子级，下方同级后插`}>
        <button className={`project-tree-chevron${children.length === 0 ? " empty" : ""}`} type="button" aria-label={expanded ? `收起 ${project.name}` : `展开 ${project.name}`} onClick={(event) => { event.stopPropagation(); if (children.length > 0) toggleExpanded(project.id); }} disabled={children.length === 0}>{children.length > 0 && (expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}</button>
        <GripVertical className="project-tree-drag-handle" size={15} aria-hidden="true" />
        <div className="project-tree-main"><div className="project-tree-title-line"><span className="project-tree-number" aria-hidden="true">{getProjectNumber(project, projects)}</span><strong>{project.name}</strong>{project.isDelayed && <span className="project-delayed-text">· 延期</span>}</div><div className="project-tree-subline">{depth === 1 && <span>主项目</span>}{depth > 1 && <span>子项目</span>}{children.length > 0 && <span>{children.length} 个下级</span>}{project.nextAction && <span className="project-tree-next-action">下一步：{project.nextAction}</span>}</div></div>
        <span className={`project-tree-status status-${status === "已完成" ? "done" : status === "进行中" ? "doing" : "todo"}`}>{status}{project.isDelayed ? " · 延期" : ""}</span>
        <span className="project-tree-progress">{progress.percent === null ? "—" : `${progress.percent}%`}</span>
        <time className="project-tree-updated">{formatShortDate(project.updatedAt)}</time>
        <ProjectNodeMenu project={project} depth={depth} onAddChild={() => setProjectForm({ parent: project })} onAddAction={() => setActionForm({ project })} onEdit={() => setProjectForm({ project, parent: project.parentId ? projects.find((item) => item.id === project.parentId) : undefined })} onMove={() => setMovingProject(project)} onDelete={() => handleDeleteProject(project)} />
      </div>
      {expanded && children.length > 0 && <div className="project-tree-children">{children.map((child) => renderProjectNode(child, depth + 1))}</div>}
    </div>;
  }
}

function ProjectNodeMenu({ project, depth, onAddChild, onAddAction, onEdit, onMove, onDelete }: { project: Project; depth: number; onAddChild: () => void; onAddAction: () => void; onEdit: () => void; onMove: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return <div className="project-node-menu-wrap" onClick={(event) => event.stopPropagation()}><button className="icon-button project-node-menu-button" type="button" aria-label={`${project.name} 更多操作`} onClick={() => setOpen((current) => !current)}><MoreVertical size={17} /></button>{open && <div className="project-node-menu" role="menu">{depth < 5 && <button type="button" onClick={() => { onAddChild(); setOpen(false); }}><Plus size={15} />新增子项目</button>}<button type="button" onClick={() => { onAddAction(); setOpen(false); }}><Plus size={15} />新增推进事项</button><button type="button" onClick={() => { onEdit(); setOpen(false); }}>编辑</button><button type="button" onClick={() => { onMove(); setOpen(false); }}>移动</button><button className="danger-menu-item" type="button" onClick={() => { onDelete(); setOpen(false); }}>删除</button></div>}</div>;
}

function ProjectStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className={`project-stat-card ${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function getProjectFormTitle(state: ProjectFormState): string {
  if (state.project) return "编辑项目";
  if (state.parent) return `新增子项目 - ${state.parent.name}`;
  return "新增主项目";
}

function buildProjectDeleteSummary(project: Project, projects: Project[]): string {
  const descendantCount = getProjectDescendantIds(project.id, projects).length;
  const actionCount = collectSubtree(project, projects).reduce((total, item) => total + (item.executionSteps || []).length, 0);
  return `项目：${project.name}\n下级项目：${descendantCount} 个\n推进事项：${actionCount} 条\n\n删除后所有下级内容将一起删除。`;
}

function collectSubtree(project: Project, projects: Project[]): Project[] {
  return [project, ...getProjectChildren(projects, project.id).flatMap((child) => collectSubtree(child, projects))];
}

function sortNodes(nodes: Project[]): Project[] {
  return [...nodes].sort(compareProjectOrder);
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function ProjectMoveModal({ project, projects, onCancel, onMoveProject, onMoveToQuadrant }: { project: Project; projects: Project[]; onCancel: () => void; onMoveProject: (projectId: string, targetParentId: string | null, position: ProjectMovePosition, referenceProjectId?: string) => void; onMoveToQuadrant: (projectId: string, quadrant: ProjectQuadrant) => void }) {
  const isRoot = !project.parentId;
  const [targetParentId, setTargetParentId] = useState(project.parentId || "");
  const [quadrant, setQuadrant] = useState<ProjectQuadrant>(project.quadrant || "important_not_urgent");
  const [position, setPosition] = useState<"first" | "last">("last");
  const root = getRootProject(project, projects);
  const candidates = projects.filter((item) => item.id !== project.id && getRootProject(item, projects).id === root.id && !getProjectDescendantIds(project.id, projects).includes(item.id)).filter((item) => canMoveProject(project.id, item.id, projects).ok);
  return <Modal title={`移动「${project.name}」`} onClose={onCancel}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); if (isRoot) { onMoveProject(project.id, null, position); onMoveToQuadrant(project.id, quadrant); } else onMoveProject(project.id, targetParentId || null, position); onCancel(); }}>
    {isRoot ? <><label>移动到<select value={quadrant} onChange={(event) => setQuadrant(event.target.value as ProjectQuadrant)}>{PROJECT_QUADRANTS.map((item) => <option key={item} value={item}>{quadrantLabels[item]}</option>)}</select></label><label>位置<select value={position} onChange={(event) => setPosition(event.target.value as "first" | "last")}><option value="first">作为首项</option><option value="last">作为末项</option></select></label></> : <><div className="readonly-field"><span>当前所属</span><strong>{getProjectPath(project, projects).map((item) => item.name).join(" > ")}</strong></div><label>移动到<select value={targetParentId} onChange={(event) => setTargetParentId(event.target.value)}><option value="">请选择目标父级</option>{candidates.map((item) => <option key={item.id} value={item.id}>{getProjectPath(item, projects).map((entry) => entry.name).join(" > ")}</option>)}</select></label><label>位置<select value={position} onChange={(event) => setPosition(event.target.value as "first" | "last")}><option value="first">作为首项</option><option value="last">作为末项</option></select></label></>}
    {!isRoot && candidates.length === 0 && <p className="field-hint">当前主项目内没有可用的目标父级。</p>}<div className="form-actions"><button className="secondary-button" type="button" onClick={onCancel}>取消</button><button className="primary-button" type="submit" disabled={!isRoot && !targetParentId}>移动</button></div>
  </form></Modal>;
}

function ProjectActionMoveModal({ project, action, projects, onCancel, onMove }: { project: Project; action: ProjectStep; projects: Project[]; onCancel: () => void; onMove: (targetProjectId: string) => void }) {
  const root = getRootProject(project, projects);
  const candidates = projects.filter((item) => getRootProject(item, projects).id === root.id);
  const [targetId, setTargetId] = useState(project.id);
  return <Modal title={`移动「${action.name}」`} onClose={onCancel}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); onMove(targetId); }}><div className="readonly-field"><span>当前所属</span><strong>{getProjectPath(project, projects).map((item) => item.name).join(" > ")}</strong></div><label>移动到<select value={targetId} onChange={(event) => setTargetId(event.target.value)}>{candidates.map((item) => <option key={item.id} value={item.id}>{getProjectPath(item, projects).map((entry) => entry.name).join(" > ")}</option>)}</select></label><div className="form-actions"><button className="secondary-button" type="button" onClick={onCancel}>取消</button><button className="primary-button" type="submit" disabled={targetId === project.id}>移动</button></div></form></Modal>;
}
