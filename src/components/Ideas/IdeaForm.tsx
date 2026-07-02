import { useState } from "react";
import type { Idea, IdeaInput, IdeaStatus, Project } from "../../types/dashboard";
import { IDEA_STATUSES } from "../../types/dashboard";
import { AttachmentField } from "../Common/AttachmentField";

interface IdeaFormProps {
  idea?: Idea;
  projects: Project[];
  onCancel: () => void;
  onSubmit: (input: IdeaInput) => void;
}

const statusLabels: Record<IdeaStatus, string> = {
  unorganized: "未整理",
  organized: "已整理",
  archived: "已归档",
  converted: "已转化",
};

export function IdeaForm({ idea, projects, onCancel, onSubmit }: IdeaFormProps) {
  const [title, setTitle] = useState(idea?.title || "");
  const [content, setContent] = useState(idea?.content || "");
  const [status, setStatus] = useState<IdeaStatus>(idea?.status || "unorganized");
  const [projectId, setProjectId] = useState(idea?.projectId || "");
  const [tagsText, setTagsText] = useState(idea?.tags?.join(", ") || "");
  const [attachments, setAttachments] = useState<string[]>(idea?.attachments?.length ? idea.attachments : idea?.imageDataUrl ? [idea.imageDataUrl] : []);
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!title.trim() && !content.trim() && attachments.length === 0) {
      setError("标题、正文或图片至少填写一项。");
      return;
    }
    onSubmit({
      type: attachments.length > 0 ? "screenshot" : "text",
      title: title.trim() || content.trim().slice(0, 24) || "未命名图文记录",
      content: content.trim(),
      imageDataUrl: attachments[0] || "",
      attachments,
      status,
      projectId,
      tags: tagsText
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
      convertedToType: idea?.convertedToType,
      convertedToId: idea?.convertedToId,
    });
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <label>
        标题
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：落地页优化想法" />
      </label>
      <label>
        正文内容
        <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={6} placeholder="写下想法、截图说明或待整理内容" />
      </label>
      <div className="form-grid">
        <label>
          状态
          <select value={status} onChange={(event) => setStatus(event.target.value as IdeaStatus)}>
            {IDEA_STATUSES.map((itemStatus) => (
              <option key={itemStatus} value={itemStatus}>
                {statusLabels[itemStatus]}
              </option>
            ))}
          </select>
        </label>
        <label>
          关联项目
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">不关联</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        标签
        <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="用逗号分隔，例如：灵感, 资料整理" />
      </label>
      <AttachmentField images={attachments} onChange={setAttachments} />
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          取消
        </button>
        <button className="primary-button" type="submit">
          保存
        </button>
      </div>
    </form>
  );
}

export function getIdeaStatusLabel(status: IdeaStatus) {
  return statusLabels[status];
}
