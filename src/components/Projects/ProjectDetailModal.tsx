import { BriefcaseBusiness, Edit3, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Category, DiaryEntry, Idea, Project, ProjectInput, ProjectStep, WorkItem, WorkItemInput } from "../../types/dashboard";
import { formatDateTime, todayInputValue } from "../../utils/date";
import { getProjectProgressSummary } from "../../utils/projectProgress";
import { ImageGallery } from "../Common/ImageGallery";
import { Modal } from "../Common/Modal";
import { WorkItemForm } from "../WorkItems/WorkItemForm";
import { getProjectQuadrantLabel, getProjectStepStatusLabel, ProjectForm } from "./ProjectForm";

export type LinkedRecordRef = { kind: "work" | "diary" | "idea"; id: string };

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
  const progressSummary = getProjectProgressSummary(project);
  const relatedWork = dedupeWorkItems(workItems.filter((item) => item.projectId === project.id || item.linkedProjectIds?.includes(project.id)));
  const relatedDiaries = diaryEntries.filter((entry) => entry.linkedProjectIds.includes(project.id));
  const relatedIdeas = ideas.filter((idea) => idea.projectId === project.id || idea.linkedProjectIds?.includes(project.id));
  const relatedImages = [
    ...relatedWork.flatMap((item) => item.images || []),
    ...relatedDiaries.flatMap((entry) => entry.images || []),
    ...relatedIdeas.flatMap((idea) => (idea.attachments?.length ? idea.attachments : idea.imageDataUrl ? [idea.imageDataUrl] : [])),
  ];
  const nextActionWorkCount = workItems.filter((item) => item.sourceProjectType === "nextAction" && item.sourceProjectId === project.id).length;

  return (
    <Modal title={editing ? "编辑项目" : "项目详情"} onClose={onClose}>
      {editing ? (
        <ProjectForm project={project} onCancel={onCancelEdit} onSubmit={onUpdate} />
      ) : (
        <div className="detail-stack project-detail">
          <div className="detail-title-row">
            <div>
              <h3>{project.name}</h3>
            </div>
            <div className="icon-actions">
              <button className="secondary-button" type="button" onClick={onEdit}>
                <Edit3 size={16} />
                编辑
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={() => {
                  if (window.confirm("确认删除这个项目？关联记录中的项目引用会同步移除。")) onDelete();
                }}
              >
                <Trash2 size={16} />
                删除
              </button>
            </div>
          </div>

          <div className="detail-meta-grid">
            <DetailMeta label="项目类型" value={project.type === "work" ? "工作项目" : "个人项目"} />
            <DetailMeta label="项目状态" value={project.status} />
            <DetailMeta label="四象限归属" value={getProjectQuadrantLabel(project.quadrant)} />
            <DetailMeta label="项目进度" value={progressSummary.hasProgressItems ? `${progressSummary.percent}%（${progressSummary.detail}）` : progressSummary.label} />
            <DetailMeta label="更新时间" value={formatDateTime(project.updatedAt)} />
            <DetailMeta label="开始时间" value={project.startDate || "未设置"} />
            <DetailMeta label="截止时间" value={project.dueDate || "未设置"} />
          </div>

          <ProjectDetailSection title="项目背景与目标">
            <DetailText label="项目背景" value={project.background || project.description} />
            <DetailText label="项目目的" value={project.purpose} />
            <DetailText label="预期结果" value={project.expectedResult} />
            <DetailText label="验收标准 / 完成定义" value={project.acceptanceCriteria} />
          </ProjectDetailSection>

          <ProjectDetailSection title="项目推进清单">
            {project.executionSteps?.length ? (
              <div className="project-step-list">
                {project.executionSteps.map((step, index) => (
                  <article className="project-step-card" key={step.id}>
                    <div>
                      <strong>{index + 1}. {step.name || "未命名推进事项"}</strong>
                      <p>{step.description || "暂无事项说明。"}</p>
                    </div>
                    <div className="chip-row">
                      <span className="chip status">{getProjectStepStatusLabel(step.status)}</span>
                      {step.dueDate && <span className="chip outline">截止 {step.dueDate}</span>}
                      {step.completedAt && <span className="chip outline">完成 {step.completedAt}</span>}
                      <span className="chip outline">{getProgressItemWorkCount(workItems, project.id, step.id) > 0 ? `已有关联工作 ${getProgressItemWorkCount(workItems, project.id, step.id)} 条` : "暂无来源工作"}</span>
                      <button className="secondary-button compact-button" type="button" onClick={() => setCreateWorkInput(buildProgressItemWorkInput(project, step, categories[0]?.id || ""))}>
                        <BriefcaseBusiness size={15} />
                        创建工作
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted-text">未拆分推进事项。</p>
            )}
          </ProjectDetailSection>

          <ProjectDetailSection title="进度追踪">
            <DetailText label="当前进展" value={project.currentProgress || project.content} />
            <div className="project-detail-text">
              <span>下一步动作</span>
              <p>{project.nextAction || "暂无内容。"}</p>
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
            </div>
            <DetailText label="阻塞问题" value={project.blockers} />
            <DetailText label="风险备注" value={project.riskNotes} />
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
            <RelatedGroup title="关联临时想法 / 图文记录" records={relatedIdeas.map((idea) => ({
              id: idea.id,
              title: idea.title || idea.content.slice(0, 24) || "未命名图文记录",
              status: idea.status === "unorganized" ? "未整理" : idea.status === "organized" ? "已整理" : idea.status === "converted" ? "已转化" : "已归档",
              updatedAt: idea.updatedAt,
              kind: "idea" as const,
            }))} onOpen={onOpenLinkedRecord} />
            <ImageGallery images={relatedImages} />
          </ProjectDetailSection>

          <ProjectDetailSection title="完成复盘">
            <DetailText label="完成结果" value={project.completionResult} />
            <DetailText label="复盘总结" value={project.retrospective} />
          </ProjectDetailSection>
        </div>
      )}
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
    </Modal>
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

function ProjectDetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="project-detail-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function DetailText({ label, value }: { label: string; value?: string }) {
  return (
    <div className="project-detail-text">
      <span>{label}</span>
      <p>{value || "暂无内容。"}</p>
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

function getProgressItemWorkCount(workItems: WorkItem[], projectId: string, itemId: string): number {
  return workItems.filter(
    (item) => item.sourceProjectType === "progressItem" && item.sourceProjectId === projectId && item.sourceProjectProgressItemId === itemId,
  ).length;
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
