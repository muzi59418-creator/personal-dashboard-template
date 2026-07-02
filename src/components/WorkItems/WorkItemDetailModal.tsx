import { Edit3, Trash2 } from "lucide-react";
import type { Category, Project, WorkItem, WorkItemInput } from "../../types/dashboard";
import { formatDate, formatDateTime } from "../../utils/date";
import { ImageGallery } from "../Common/ImageGallery";
import { Modal } from "../Common/Modal";
import { WorkItemForm } from "./WorkItemForm";

interface WorkItemDetailModalProps {
  item: WorkItem;
  categories: Category[];
  projects: Project[];
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onClose: () => void;
  onUpdate: (input: WorkItemInput) => void;
  onDelete: () => void;
}

export function WorkItemDetailModal({
  item,
  categories,
  projects,
  editing,
  onEdit,
  onCancelEdit,
  onClose,
  onUpdate,
  onDelete,
}: WorkItemDetailModalProps) {
  const category = categories.find((entry) => entry.id === item.categoryId);
  const project = projects.find((entry) => entry.id === item.projectId);

  return (
    <Modal title={editing ? "编辑工作内容" : "工作内容详情"} onClose={onClose}>
      {editing ? (
        <WorkItemForm item={item} categories={categories} projects={projects} onCancel={onCancelEdit} onSubmit={onUpdate} />
      ) : (
        <div className="detail-stack">
          <div className="detail-title-row">
            <div>
              <h3>{item.title}</h3>
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
                  if (window.confirm("确认删除这条工作内容？")) onDelete();
                }}
              >
                <Trash2 size={16} />
                删除
              </button>
            </div>
          </div>
          <div className="detail-meta-grid">
            <DetailMeta label="分类" value={category?.name || "未分类"} />
            <DetailMeta label="状态" value={item.status} />
            <DetailMeta label="日期" value={formatDate(item.date)} />
            <DetailMeta label="关联项目" value={project?.name || "不关联"} />
            <DetailMeta label="创建时间" value={formatDateTime(item.createdAt)} />
            <DetailMeta label="更新时间" value={formatDateTime(item.updatedAt)} />
          </div>
          <p className="detail-content">{item.content}</p>
          <ImageGallery images={item.images || []} />
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
