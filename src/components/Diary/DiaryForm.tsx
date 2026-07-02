import { useState } from "react";
import type { DiaryEntry, DiaryEntryInput, Project } from "../../types/dashboard";
import { todayInputValue } from "../../utils/date";
import { AttachmentField } from "../Common/AttachmentField";
import { DateInput } from "../Common/DateInput";

interface DiaryFormProps {
  entry?: DiaryEntry;
  projects: Project[];
  onCancel: () => void;
  onSubmit: (input: DiaryEntryInput) => void;
}

export function DiaryForm({ entry, projects, onCancel, onSubmit }: DiaryFormProps) {
  const [date, setDate] = useState(entry?.date || todayInputValue());
  const [title, setTitle] = useState(entry?.title || "");
  const [content, setContent] = useState(entry?.content || "");
  const [tagsText, setTagsText] = useState(entry?.tags.join(", ") || "");
  const [linkedProjectIds, setLinkedProjectIds] = useState<string[]>(entry?.linkedProjectIds || []);
  const [images, setImages] = useState<string[]>(entry?.images || []);
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!date || !title.trim() || !content.trim()) {
      setError("日期、标题和正文都是必填项。");
      return;
    }
    onSubmit({
      date,
      title: title.trim(),
      content: content.trim(),
      tags: tagsText
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
      linkedProjectIds,
      images,
    });
  }

  function toggleProject(projectId: string) {
    setLinkedProjectIds((current) =>
      current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId],
    );
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <label>
        日期
        <DateInput value={date} onChange={(event) => setDate(event.target.value)} required />
      </label>
      <label>
        标题
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：用户调研问卷设计" required />
      </label>
      <label>
        正文
        <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={6} placeholder="记录今天完成了什么、遇到什么问题" required />
      </label>
      <label>
        标签
        <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="用逗号分隔，例如：调研, 用户运营" />
      </label>
      <fieldset>
        <legend>关联项目</legend>
        <div className="checkbox-grid">
          {projects.map((project) => (
            <label key={project.id} className="checkbox-line">
              <input type="checkbox" checked={linkedProjectIds.includes(project.id)} onChange={() => toggleProject(project.id)} />
              {project.name}
            </label>
          ))}
        </div>
      </fieldset>
      <AttachmentField images={images} onChange={setImages} />
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
