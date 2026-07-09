import { BriefcaseBusiness, CheckCircle2, Edit3, Trash2, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type {
  Category,
  DiaryEntry,
  Idea,
  Project,
  ProjectInput,
  ProjectQuadrant,
  ProjectStatus,
  ProjectStep,
  ProjectStepStatus,
  WorkItem,
  WorkItemInput,
} from "../../types/dashboard";
import { PROJECT_QUADRANTS, PROJECT_STATUSES, PROJECT_STEP_STATUSES } from "../../types/dashboard";
import { formatDateTime, todayInputValue } from "../../utils/date";
import { createId } from "../../utils/id";
import { getProjectProgressSummary } from "../../utils/projectProgress";
import { DateInput } from "../Common/DateInput";
import { ImageGallery } from "../Common/ImageGallery";
import { Modal } from "../Common/Modal";
import { WorkItemForm } from "../WorkItems/WorkItemForm";
import { getProjectQuadrantLabel, getProjectStepStatusLabel, ProjectForm } from "./ProjectForm";

export type LinkedRecordRef = { kind: "work" | "diary" | "idea"; id: string };

type EditableProjectTextField = "currentProgress" | "nextAction" | "blockers" | "riskNotes" | "retrospective";

interface ProjectDetailModalProps {
  project: Project;
  workItems: WorkItem[];
  diaryEntries: DiaryEntry[];
  ideas: Idea[];
  categories: Category[];
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onClose: () => void;
  onUpdate: (input: ProjectInput) => void;
  onDelete: () => void;
  onCreateWork: (input: WorkItemInput) => void;
  onOpenLinkedRecord: (record: LinkedRecordRef) => void;
}

export function ProjectDetailModal({
  project,
  workItems,
  diaryEntries,
  ideas,
  categories,
  editing,
  onEdit,
  onCancelEdit,
  onClose,
  onUpdate,
  onDelete,
  onCreateWork,
  onOpenLinkedRecord,
}: ProjectDetailModalProps) {
  const [createWorkInput, setCreateWorkInput] = useState<Partial<WorkItemInput> | null>(null);
  const [startWithNewProgressItem, setStartWithNewProgressItem] = useState(false);
  const [editingTextField, setEditingTextField] = useState<EditableProjectTextField | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [stepDraft, setStepDraft] = useState<ProjectStep | null>(null);
  const progressSummary = getProjectProgressSummary(project);
  const progressLabel = progressSummary.hasProgressItems ? `${progressSummary.percent}%（${progressSummary.detail}）` : progressSummary.label;
  const relatedWork = dedupeWorkItems(workItems.filter((item) => item.projectId === project.id || item.linkedProjectIds?.includes(project.id)));
  const relatedDiaries = diaryEntries.filter((entry) => entry.linkedProjectIds.includes(project.id));
  const relatedIdeas = ideas.filter((idea) => idea.projectId === project.id || idea.linkedProjectIds?.includes(project.id));
  const relatedImages = [
    ...relatedWork.flatMap((item) => item.images || []),
    ...relatedDiaries.flatMap((entry) => entry.images || []),
    ...relatedIdeas.flatMap((idea) => (idea.attachments?.length ? idea.attachments : idea.imageDataUrl ? [idea.imageDataUrl] : [])),
  ];
  const hasRelatedContent = relatedWork.length > 0 || relatedDiaries.length > 0 || relatedIdeas.length > 0 || relatedImages.length > 0;
  const nextActionWorkCount = workItems.filter((item) => item.sourceProjectType === "nextAction" && item.sourceProjectId === project.id).length;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !createWorkInput) onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createWorkInput, onClose]);

  useEffect(() => {
    setEditingTextField(null);
    setTextDraft("");
    setEditingStepId(null);
    setStepDraft(null);
  }, [project.id]);

  function closeFromBackdrop() {
    if (!editing) onClose();
  }

  function markStepDone(step: ProjectStep) {
    if (step.status === "done") return;
    onUpdate({
      ...toProjectInput(project),
      executionSteps: (project.executionSteps || []).map((item) =>
        item.id === step.id ? { ...item, status: "done", completedAt: item.completedAt || todayInputValue() } : item,
      ),
    });
  }

  function updateProjectPatch(patch: Partial<ProjectInput>) {
    onUpdate({
      ...toProjectInput(project),
      ...patch,
    });
  }

  function updateProjectStatus(status: ProjectStatus) {
    if (status === project.status) return;
    updateProjectPatch({ status });
  }

  function updateProjectQuadrant(quadrant: ProjectQuadrant) {
    if (quadrant === (project.quadrant || "important_not_urgent")) return;
    updateProjectPatch({ quadrant });
  }

  function updateStepStatus(step: ProjectStep, status: ProjectStepStatus) {
    if (status === step.status) return;
    updateProjectPatch({
      executionSteps: (project.executionSteps || []).map((item) =>
        item.id === step.id
          ? {
              ...item,
              status,
              completedAt: status === "done" ? item.completedAt || todayInputValue() : "",
            }
          : item,
      ),
    });
  }

  function beginStepEdit(step: ProjectStep) {
    setEditingTextField(null);
    setEditingStepId(step.id);
    setStepDraft({ ...step });
  }

  function beginNewStep() {
    setEditingTextField(null);
    const newStep = createBlankStep();
    setEditingStepId(newStep.id);
    setStepDraft(newStep);
  }

  function updateStepDraft(patch: Partial<ProjectStep>) {
    setStepDraft((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      if (patch.status === "done" && !next.completedAt) {
        next.completedAt = todayInputValue();
      }
      if (patch.status && patch.status !== "done") {
        next.completedAt = "";
      }
      return next;
    });
  }

  function cancelStepEdit() {
    setEditingStepId(null);
    setStepDraft(null);
  }

  function saveStepEdit() {
    if (!stepDraft) return;
    const normalizedStep = {
      ...stepDraft,
      name: stepDraft.name.trim(),
      description: stepDraft.description.trim(),
      completedAt: stepDraft.status === "done" ? stepDraft.completedAt : "",
    };
    const existingSteps = project.executionSteps || [];
    const nextSteps = existingSteps.some((step) => step.id === normalizedStep.id)
      ? existingSteps.map((step) => (step.id === normalizedStep.id ? normalizedStep : step))
      : [...existingSteps, normalizedStep];
    updateProjectPatch({ executionSteps: nextSteps });
    cancelStepEdit();
  }

  function beginTextEdit(field: EditableProjectTextField, value: string) {
    setEditingTextField(field);
    setTextDraft(value);
  }

  function cancelTextEdit() {
    setEditingTextField(null);
    setTextDraft("");
  }

  function saveTextEdit(field: EditableProjectTextField) {
    const value = textDraft.trim();
    if (field === "currentProgress") {
      updateProjectPatch({ currentProgress: value, content: value });
    } else {
      updateProjectPatch({ [field]: value });
    }
    cancelTextEdit();
  }

  function startAddingProgressItem() {
    beginNewStep();
  }

  return (
    <>
      <div className="project-drawer-backdrop" role="presentation" onMouseDown={closeFromBackdrop}>
        <section
          className="project-detail-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={editing ? "编辑项目" : "项目详情"}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="project-drawer-header">
            <div className="project-drawer-title-row">
              <div className="project-drawer-title">
                <h2>{project.name}</h2>
                <div className="project-drawer-summary">
                  <span className="chip status">{project.status}</span>
                  <span>{progressLabel}</span>
                  <span>{getProjectQuadrantLabel(project.quadrant)}</span>
                </div>
              </div>
              <div className="project-drawer-actions">
                <button className="secondary-button compact-button" type="button" onClick={onEdit} disabled={editing}>
                  <Edit3 size={15} />
                  编辑
                </button>
                <button
                  className="danger-button compact-button"
                  type="button"
                  onClick={() => {
                    if (window.confirm("确认删除这个项目？关联记录中的项目引用会同步移除。")) onDelete();
                  }}
                >
                  <Trash2 size={15} />
                  删除
                </button>
                <button className="icon-button" type="button" aria-label="关闭项目详情" title="关闭" onClick={onClose}>
                  <X size={18} />
                </button>
              </div>
            </div>
          </header>

          <div className="project-drawer-body">
            {editing ? (
              <ProjectForm
                project={project}
                initialBlankStep={startWithNewProgressItem}
                onCancel={() => {
                  setStartWithNewProgressItem(false);
                  onCancelEdit();
                }}
                onSubmit={(input) => {
                  setStartWithNewProgressItem(false);
                  onUpdate(input);
                }}
              />
            ) : (
              <div className="detail-stack project-detail">
                <ProjectDetailSection title="项目概览">
                  <div className="detail-meta-grid project-overview-meta-grid">
                    <DetailMeta label="项目类型" value={project.type === "work" ? "工作项目" : "个人项目"} />
                    <DetailSelect
                      label="项目状态"
                      value={project.status}
                      options={PROJECT_STATUSES}
                      getOptionLabel={(status) => status}
                      onChange={updateProjectStatus}
                    />
                    <DetailSelect
                      label="四象限归属"
                      value={project.quadrant || "important_not_urgent"}
                      options={PROJECT_QUADRANTS}
                      getOptionLabel={getProjectQuadrantLabel}
                      onChange={updateProjectQuadrant}
                    />
                    <DetailMeta label="项目进度" value={progressLabel} />
                    <DetailMeta label="更新时间" value={formatDateTime(project.updatedAt)} />
                    <DetailMeta label="开始时间" value={project.startDate || "未设置"} />
                    <DetailMeta label="截止时间" value={project.dueDate || "未设置"} />
                  </div>
                  <div className="project-detail-text-grid">
                    <DetailText label="项目背景" value={project.background || project.description} />
                    <DetailText label="项目目的" value={project.purpose} />
                    <DetailText label="预期结果" value={project.expectedResult} />
                    <DetailText label="验收标准 / 完成定义" value={project.acceptanceCriteria} />
                  </div>
                </ProjectDetailSection>

                <ProjectDetailSection
                  title="项目推进清单"
                  defaultOpen
                  emphasized
                  action={
                    <button className="secondary-button compact-button" type="button" onClick={startAddingProgressItem}>
                      添加推进事项
                    </button>
                  }
                >
                  {editingStepId && stepDraft && !project.executionSteps?.some((step) => step.id === editingStepId) && (
                    <ProjectStepInlineEditor step={stepDraft} title="添加推进事项" onChange={updateStepDraft} onSave={saveStepEdit} onCancel={cancelStepEdit} />
                  )}
                  {project.executionSteps?.length ? (
                    <div className="project-step-list">
                      {project.executionSteps.map((step, index) => {
                        const progressItemWorkItems = getProgressItemWorkItems(workItems, project.id, step.id);
                        const isStepEditing = editingStepId === step.id && stepDraft;
                        return (
                          <article className={`project-step-card project-step-card-detailed${step.status === "done" ? " project-step-card-done" : ""}`} key={step.id}>
                            {isStepEditing ? (
                              <ProjectStepInlineEditor step={stepDraft} title={`编辑事项 ${index + 1}`} onChange={updateStepDraft} onSave={saveStepEdit} onCancel={cancelStepEdit} />
                            ) : (
                              <>
                                <div className="project-step-card-head">
                                  <span className="project-step-index">{index + 1}</span>
                                  <div className="project-step-title-block">
                                    <strong>{step.name || "未命名推进事项"}</strong>
                                    <p>{getStepDescriptionSummary(step.description)}</p>
                                  </div>
                                  <label className="chip status quick-select-chip">
                                    <span className="sr-only">推进事项状态</span>
                                    <select value={step.status} onChange={(event) => updateStepStatus(step, event.target.value as ProjectStepStatus)}>
                                      {PROJECT_STEP_STATUSES.map((status) => (
                                        <option key={status} value={status}>
                                          {getProjectStepStatusLabel(status)}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                </div>
                                <div className="project-step-card-foot">
                                  <div className="project-step-source">
                                    <span>计划截止：{step.dueDate || "未设置"}</span>
                                    {step.completedAt && <span className="chip outline">完成 {step.completedAt}</span>}
                                    {progressItemWorkItems.length > 0 && (
                                      <span className="project-step-linked-work">
                                        已关联工作：
                                        {progressItemWorkItems.map((item, workIndex) => (
                                          <button className="text-button compact-text-button" type="button" key={item.id} onClick={() => onOpenLinkedRecord({ kind: "work", id: item.id })}>
                                            {workIndex > 0 ? "、" : ""}
                                            {item.title}
                                          </button>
                                        ))}
                                      </span>
                                    )}
                                  </div>
                                  <div className="project-step-actions">
                                    <button className="secondary-button compact-button" type="button" onClick={() => setCreateWorkInput(buildProgressItemWorkInput(project, step, categories[0]?.id || ""))}>
                                      <BriefcaseBusiness size={15} />
                                      创建工作
                                    </button>
                                    <button className="secondary-button compact-button" type="button" onClick={() => markStepDone(step)} disabled={step.status === "done"}>
                                      <CheckCircle2 size={15} />
                                      标记完成
                                    </button>
                                    <button className="secondary-button compact-button" type="button" onClick={() => beginStepEdit(step)}>
                                      <Edit3 size={15} />
                                      编辑事项
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="project-step-empty">
                      <p className="muted-text">暂未拆分推进事项。</p>
                      <button className="secondary-button compact-button" type="button" onClick={startAddingProgressItem}>
                        添加推进事项
                      </button>
                    </div>
                  )}
                </ProjectDetailSection>

                <ProjectDetailSection title="进度追踪">
                  <EditableDetailText
                    label="当前进展"
                    value={project.currentProgress || project.content || ""}
                    emptyText="暂无内容。"
                    editLabel="编辑"
                    isEditing={editingTextField === "currentProgress"}
                    draft={textDraft}
                    onBegin={() => beginTextEdit("currentProgress", project.currentProgress || project.content || "")}
                    onDraftChange={setTextDraft}
                    onSave={() => saveTextEdit("currentProgress")}
                    onCancel={cancelTextEdit}
                  />
                  <div className="project-detail-text">
                    <div className="project-detail-text-head">
                      <span>下一步动作</span>
                      {editingTextField !== "nextAction" && (
                        <button className="text-button compact-text-button" type="button" onClick={() => beginTextEdit("nextAction", project.nextAction || "")}>
                          编辑下一步
                        </button>
                      )}
                    </div>
                    {editingTextField === "nextAction" ? (
                      <TextQuickEditor value={textDraft} rows={3} onChange={setTextDraft} onSave={() => saveTextEdit("nextAction")} onCancel={cancelTextEdit} />
                    ) : (
                      <>
                        <p className={!project.nextAction ? "empty-content-text" : undefined}>{project.nextAction || "下一步：暂未设置"}</p>
                        {project.nextAction ? (
                          <div className="inline-action-row">
                            {nextActionWorkCount > 0 && <span className="chip outline">已有关联工作 {nextActionWorkCount} 条</span>}
                            <button className="secondary-button compact-button" type="button" onClick={() => setCreateWorkInput(buildNextActionWorkInput(project, categories[0]?.id || ""))}>
                              <BriefcaseBusiness size={15} />
                              转为工作
                            </button>
                          </div>
                        ) : (
                          <p className="field-hint">下一步动作为空时不可转为工作。</p>
                        )}
                      </>
                    )}
                  </div>
                  <EditableDetailText
                    label="阻塞问题"
                    value={project.blockers || ""}
                    emptyText="暂无内容。"
                    editLabel="编辑"
                    isEditing={editingTextField === "blockers"}
                    draft={textDraft}
                    onBegin={() => beginTextEdit("blockers", project.blockers || "")}
                    onDraftChange={setTextDraft}
                    onSave={() => saveTextEdit("blockers")}
                    onCancel={cancelTextEdit}
                  />
                </ProjectDetailSection>

                <ProjectDetailSection title="关联内容">
                  <RelatedGroup title="关联工作内容" records={relatedWork.map((item) => ({
                    id: item.id,
                    title: item.title,
                    status: getRelatedWorkStatus(item),
                    updatedAt: item.updatedAt,
                    kind: "work" as const,
                  }))} onOpen={onOpenLinkedRecord} />
                  <RelatedGroup title="关联工作日记" records={relatedDiaries.map((entry) => ({
                    id: entry.id,
                    title: entry.title,
                    status: "工作日记",
                    updatedAt: entry.updatedAt,
                    kind: "diary" as const,
                  }))} onOpen={onOpenLinkedRecord} />
                  <RelatedGroup title="关联灵感 / 临时想法" records={relatedIdeas.map((idea) => ({
                    id: idea.id,
                    title: idea.title || idea.content.slice(0, 24) || "未命名图文记录",
                    status: idea.status === "unorganized" ? "未整理" : idea.status === "organized" ? "已整理" : idea.status === "converted" ? "已转化" : "已归档",
                    updatedAt: idea.updatedAt,
                    kind: "idea" as const,
                  }))} onOpen={onOpenLinkedRecord} />
                  <ImageGallery images={relatedImages} />
                </ProjectDetailSection>

                <ProjectDetailSection title="备注与风险">
                  <EditableDetailText
                    label="风险备注"
                    value={project.riskNotes || ""}
                    emptyText="暂无内容。"
                    editLabel="编辑"
                    isEditing={editingTextField === "riskNotes"}
                    draft={textDraft}
                    onBegin={() => beginTextEdit("riskNotes", project.riskNotes || "")}
                    onDraftChange={setTextDraft}
                    onSave={() => saveTextEdit("riskNotes")}
                    onCancel={cancelTextEdit}
                  />
                  <EditableDetailText
                    label="其他备注"
                    value={project.retrospective || ""}
                    emptyText="暂无内容。"
                    editLabel="编辑"
                    isEditing={editingTextField === "retrospective"}
                    draft={textDraft}
                    onBegin={() => beginTextEdit("retrospective", project.retrospective || "")}
                    onDraftChange={setTextDraft}
                    onSave={() => saveTextEdit("retrospective")}
                    onCancel={cancelTextEdit}
                  />
                </ProjectDetailSection>
              </div>
            )}
          </div>
        </section>
      </div>

      {createWorkInput && (
        <Modal title="新增工作内容" onClose={() => setCreateWorkInput(null)}>
          <WorkItemForm
            categories={categories}
            projects={[project]}
            initialInput={createWorkInput}
            onCancel={() => setCreateWorkInput(null)}
            onSubmit={(input) => {
              onCreateWork(input);
              setCreateWorkInput(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}

function ProjectStepInlineEditor({
  step,
  title,
  onChange,
  onSave,
  onCancel,
}: {
  step: ProjectStep;
  title: string;
  onChange: (patch: Partial<ProjectStep>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="project-step-inline-editor">
      <div className="project-step-editor-head">
        <strong>{title}</strong>
        <span className="field-hint">只修改这一条推进事项</span>
      </div>
      <label>
        要做什么
        <input value={step.name} onChange={(event) => onChange({ name: event.target.value })} />
      </label>
      <label>
        补充说明
        <textarea value={step.description} onChange={(event) => onChange({ description: event.target.value })} rows={2} />
      </label>
      <div className="form-grid compact-step-form-grid">
        <label>
          事项状态
          <select value={step.status} onChange={(event) => onChange({ status: event.target.value as ProjectStepStatus })}>
            {PROJECT_STEP_STATUSES.map((stepStatus) => (
              <option key={stepStatus} value={stepStatus}>
                {getProjectStepStatusLabel(stepStatus)}
              </option>
            ))}
          </select>
        </label>
        <label>
          计划截止
          <DateInput value={step.dueDate} onChange={(event) => onChange({ dueDate: event.target.value })} />
        </label>
      </div>
      {step.status === "done" ? (
        <label>
          完成时间
          <DateInput value={step.completedAt} onChange={(event) => onChange({ completedAt: event.target.value })} />
        </label>
      ) : (
        <p className="field-hint">标记为已完成后再记录完成时间。</p>
      )}
      <div className="quick-edit-actions">
        <button className="primary-button compact-button" type="button" onClick={onSave}>
          保存事项
        </button>
        <button className="secondary-button compact-button" type="button" onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}

function DetailMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-meta-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailSelect<TValue extends string>({
  label,
  value,
  options,
  getOptionLabel,
  onChange,
}: {
  label: string;
  value: TValue;
  options: TValue[];
  getOptionLabel: (value: TValue) => string;
  onChange: (value: TValue) => void;
}) {
  return (
    <label className="detail-meta-item quick-select-meta">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as TValue)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {getOptionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProjectDetailSection({
  title,
  children,
  defaultOpen = false,
  emphasized = false,
  action,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  emphasized?: boolean;
  action?: ReactNode;
}) {
  return (
    <details className={`project-detail-section project-detail-disclosure${emphasized ? " project-detail-section-core" : ""}`} open={defaultOpen}>
      <summary>
        <span>{title}</span>
        {action && (
          <span className="project-detail-summary-action" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
            {action}
          </span>
        )}
      </summary>
      <div className="project-detail-section-body">{children}</div>
    </details>
  );
}

function DetailText({ label, value }: { label: string; value?: string }) {
  return (
    <div className="project-detail-text">
      <span>{label}</span>
      <p className={!value ? "empty-content-text" : undefined}>{value || "暂无内容。"}</p>
    </div>
  );
}

function EditableDetailText({
  label,
  value,
  emptyText,
  editLabel,
  isEditing,
  draft,
  onBegin,
  onDraftChange,
  onSave,
  onCancel,
}: {
  label: string;
  value: string;
  emptyText: string;
  editLabel: string;
  isEditing: boolean;
  draft: string;
  onBegin: () => void;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="project-detail-text">
      <div className="project-detail-text-head">
        <span>{label}</span>
        {!isEditing && (
          <button className="text-button compact-text-button" type="button" onClick={onBegin}>
            {editLabel}
          </button>
        )}
      </div>
      {isEditing ? (
        <TextQuickEditor value={draft} rows={3} onChange={onDraftChange} onSave={onSave} onCancel={onCancel} />
      ) : (
        <p className={!value ? "empty-content-text" : undefined}>{value || emptyText}</p>
      )}
    </div>
  );
}

function TextQuickEditor({
  value,
  rows,
  onChange,
  onSave,
  onCancel,
}: {
  value: string;
  rows: number;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="quick-text-editor">
      <textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} />
      <div className="quick-edit-actions">
        <button className="primary-button compact-button" type="button" onClick={onSave}>
          保存
        </button>
        <button className="secondary-button compact-button" type="button" onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}

interface RelatedRecord {
  id: string;
  kind: LinkedRecordRef["kind"];
  title: string;
  status: string;
  updatedAt: string;
}

function RelatedGroup({ title, records, onOpen }: { title: string; records: RelatedRecord[]; onOpen: (record: LinkedRecordRef) => void }) {
  return (
    <div className="related-group">
      <h4>{title}</h4>
      {records.length === 0 ? (
        <p className="muted-text">暂无关联记录。</p>
      ) : (
        <div className="related-record-list">
          {records.map((record) => (
            <button className="related-record-row" type="button" key={`${record.kind}-${record.id}`} onClick={() => onOpen(record)}>
              <span>{record.title}</span>
              <strong>{record.status}</strong>
              <time>{formatDateTime(record.updatedAt)}</time>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function buildProgressItemWorkInput(project: Project, item: ProjectStep, fallbackCategoryId: string): Partial<WorkItemInput> {
  return {
    title: item.name,
    categoryId: fallbackCategoryId,
    status: "待处理",
    content: item.description,
    date: item.dueDate || "",
    plannedDate: "",
    projectId: project.id,
    linkedProjectIds: [project.id],
    sourceProjectType: "progressItem",
    sourceProjectId: project.id,
    sourceProjectProgressItemId: item.id,
    sourceProjectProgressItemName: item.name,
    images: [],
  };
}

function buildNextActionWorkInput(project: Project, fallbackCategoryId: string): Partial<WorkItemInput> {
  return {
    title: project.nextAction || "",
    categoryId: fallbackCategoryId,
    status: "待处理",
    content: project.nextAction || "",
    date: project.dueDate || todayInputValue(),
    plannedDate: todayInputValue(),
    projectId: project.id,
    linkedProjectIds: [project.id],
    sourceProjectType: "nextAction",
    sourceProjectId: project.id,
    images: [],
  };
}

function getProgressItemWorkItems(workItems: WorkItem[], projectId: string, itemId: string): WorkItem[] {
  return workItems.filter(
    (item) => item.sourceProjectType === "progressItem" && item.sourceProjectId === projectId && item.sourceProjectProgressItemId === itemId,
  );
}

function getRelatedWorkStatus(item: WorkItem): string {
  if (item.sourceProjectType === "progressItem") return `${item.status} · 来源：推进事项`;
  if (item.sourceProjectType === "nextAction") return `${item.status} · 来源：项目下一步动作`;
  return item.status;
}

function dedupeWorkItems(items: WorkItem[]): WorkItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function getStepDescriptionSummary(description: string): string {
  const value = description.trim();
  if (!value) return "暂无事项说明。";
  return value.length > 80 ? `${value.slice(0, 80)}...` : value;
}

function createBlankStep(): ProjectStep {
  return { id: createId("step"), name: "", description: "", status: "todo", dueDate: "", completedAt: "" };
}

function toProjectInput(project: Project): ProjectInput {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = project;
  return input;
}
