import { Archive, CheckCircle2, Edit3, FolderKanban, NotebookPen, Trash2 } from "lucide-react";
import type { Category, DiaryEntryInput, Idea, IdeaInput, Project, WorkItemInput } from "../../types/dashboard";
import { WORK_STATUSES } from "../../types/dashboard";
import { formatDateTime, todayInputValue } from "../../utils/date";
import { ImageGallery } from "../Common/ImageGallery";
import { Modal } from "../Common/Modal";
import { IdeaForm, getIdeaStatusLabel } from "./IdeaForm";

interface IdeaDetailModalProps {
  idea: Idea;
  projects: Project[];
  categories: Category[];
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onClose: () => void;
  onUpdate: (input: IdeaInput) => void;
  onDelete: () => void;
  onConvertToWork: (input: WorkItemInput) => void;
  onConvertToDiary: (input: DiaryEntryInput) => void;
}

export function IdeaDetailModal({
  idea,
  projects,
  categories,
  editing,
  onEdit,
  onCancelEdit,
  onClose,
  onUpdate,
  onDelete,
  onConvertToWork,
  onConvertToDiary,
}: IdeaDetailModalProps) {
  const project = projects.find((entry) => entry.id === idea.projectId);
  const images = idea.attachments?.length ? idea.attachments : idea.imageDataUrl ? [idea.imageDataUrl] : [];

  function mark(status: Idea["status"]) {
    onUpdate({ ...idea, status });
  }

  function convertToWork() {
    const categoryId = categories[0]?.id || "";
    if (!categoryId) {
      window.alert("请先创建至少一个工作内容分类。");
      return;
    }
    onConvertToWork({
      title: idea.title || "由想法转化的工作内容",
      categoryId,
      status: WORK_STATUSES[0],
      content: idea.content || idea.title || "由想法转化的工作内容",
      date: todayInputValue(),
      projectId: idea.projectId || "",
      images,
    });
  }

  function convertToDiary() {
    onConvertToDiary({
      date: todayInputValue(),
      title: idea.title || "由想法转化的工作日记",
      content: idea.content || idea.title || "由想法转化的工作日记",
      tags: idea.tags || [],
      linkedProjectIds: idea.projectId ? [idea.projectId] : [],
      images,
    });
  }

  return (
    <Modal title={editing ? "编辑图文记录" : "图文记录详情"} onClose={onClose}>
      {editing ? (
        <IdeaForm idea={idea} projects={projects} onCancel={onCancelEdit} onSubmit={onUpdate} />
      ) : (
        <div className="detail-stack">
          <div className="detail-title-row">
            <div>
              <h3>{idea.title || "未命名图文记录"}</h3>
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
                  if (window.confirm("确认删除这条图文记录？")) onDelete();
                }}
              >
                <Trash2 size={16} />
                删除
              </button>
            </div>
          </div>
          <div className="detail-meta-grid">
            <DetailMeta label="状态" value={getIdeaStatusLabel(idea.status)} />
            <DetailMeta label="关联项目" value={project?.name || "不关联"} />
            <DetailMeta label="创建时间" value={formatDateTime(idea.createdAt)} />
            <DetailMeta label="更新时间" value={formatDateTime(idea.updatedAt)} />
          </div>
          <p className="detail-content">{idea.content || "暂无正文内容。"}</p>
          <div className="chip-row">
            {(idea.tags || []).map((tag) => (
              <span className="chip" key={tag}>
                {tag}
              </span>
            ))}
            {idea.convertedToType && <span className="chip outline">已转化为{idea.convertedToType === "work" ? "工作内容" : "工作日记"}</span>}
          </div>
          <ImageGallery images={images} />
          <div className="detail-action-grid">
            <button className="secondary-button" type="button" onClick={convertToWork}>
              <FolderKanban size={16} />
              转为工作内容
            </button>
            <button className="secondary-button" type="button" onClick={convertToDiary}>
              <NotebookPen size={16} />
              转为工作日记
            </button>
            <button className="secondary-button" type="button" onClick={onEdit}>
              <FolderKanban size={16} />
              关联项目
            </button>
            <button className="secondary-button" type="button" onClick={() => mark("organized")}>
              <CheckCircle2 size={16} />
              标记已整理
            </button>
            <button className="secondary-button" type="button" onClick={() => mark("archived")}>
              <Archive size={16} />
              归档
            </button>
          </div>
        </div>
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
