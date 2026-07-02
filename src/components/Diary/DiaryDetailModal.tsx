import { Edit3, Trash2 } from "lucide-react";
import type { DiaryEntry, DiaryEntryInput, Project } from "../../types/dashboard";
import { formatDate, formatDateTime } from "../../utils/date";
import { ImageGallery } from "../Common/ImageGallery";
import { Modal } from "../Common/Modal";
import { DiaryForm } from "./DiaryForm";

interface DiaryDetailModalProps {
  entry: DiaryEntry;
  projects: Project[];
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onClose: () => void;
  onUpdate: (input: DiaryEntryInput) => void;
  onDelete: () => void;
}

export function DiaryDetailModal({ entry, projects, editing, onEdit, onCancelEdit, onClose, onUpdate, onDelete }: DiaryDetailModalProps) {
  const projectMap = new Map(projects.map((project) => [project.id, project.name]));

  return (
    <Modal title={editing ? "编辑工作日记" : "工作日记详情"} onClose={onClose}>
      {editing ? (
        <DiaryForm entry={entry} projects={projects} onCancel={onCancelEdit} onSubmit={onUpdate} />
      ) : (
        <div className="detail-stack">
          <div className="detail-title-row">
            <div>
              <span className="detail-date-large">{formatDate(entry.date)}</span>
              <h3>{entry.title}</h3>
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
                  if (window.confirm("确认删除这条工作日记？")) onDelete();
                }}
              >
                <Trash2 size={16} />
                删除
              </button>
            </div>
          </div>
          <p className="detail-content">{entry.content}</p>
          <div className="chip-row">
            {entry.tags.map((tag) => (
              <span className="chip" key={tag}>
                {tag}
              </span>
            ))}
            {entry.linkedProjectIds.map((projectId) => (
              <span className="chip outline" key={projectId}>
                {projectMap.get(projectId) || "关联项目"}
              </span>
            ))}
          </div>
          <ImageGallery images={entry.images || []} />
          <div className="detail-meta-grid">
            <DetailMeta label="创建时间" value={formatDateTime(entry.createdAt)} />
            <DetailMeta label="更新时间" value={formatDateTime(entry.updatedAt)} />
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
