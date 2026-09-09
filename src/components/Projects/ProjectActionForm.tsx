import { useState } from "react";
import type { ProjectStep } from "../../types/dashboard";

export type ProjectActionInput = Omit<ProjectStep, "id">;

interface ProjectActionFormProps {
  action?: ProjectStep;
  onCancel: () => void;
  onSubmit: (input: ProjectActionInput) => void;
}

export function ProjectActionForm({ action, onCancel, onSubmit }: ProjectActionFormProps) {
  const [name, setName] = useState(action?.name || "");
  const [description, setDescription] = useState(action?.description || "");
  const [completed, setCompleted] = useState(action?.status === "done");
  const [dueDate, setDueDate] = useState(action?.dueDate || "");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("推进事项是必填项。");
      return;
    }
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      status: completed ? "done" : "todo",
      dueDate,
      completedAt: completed ? action?.completedAt || new Date().toISOString().slice(0, 10) : "",
    });
  }

  return (
    <form className="form-stack project-action-form" onSubmit={submit}>
      <label>
        推进事项
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：确认首页视觉稿" autoFocus required />
      </label>
      <label>
        补充说明
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
      </label>
      <label>
        计划截止
        <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
      </label>
      <label className="checkbox-field">
        <input type="checkbox" checked={completed} onChange={(event) => setCompleted(event.target.checked)} />
        <span>已完成</span>
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>取消</button>
        <button className="primary-button" type="submit">保存</button>
      </div>
    </form>
  );
}

