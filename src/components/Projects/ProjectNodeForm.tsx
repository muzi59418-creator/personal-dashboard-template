import { useState } from "react";
import type { Project, ProjectInput, ProjectQuadrant } from "../../types/dashboard";
import { PROJECT_QUADRANTS } from "../../types/dashboard";

const quadrantLabels: Record<ProjectQuadrant, string> = {
  important_urgent: "重要且紧急",
  important_not_urgent: "重要但不紧急",
  urgent_not_important: "紧急但不重要",
  not_important_not_urgent: "不重要且不紧急",
};

interface ProjectNodeFormProps {
  project?: Project;
  parent?: Project;
  onCancel: () => void;
  onSubmit: (input: ProjectInput) => void;
}

export function ProjectNodeForm({ project, parent, onCancel, onSubmit }: ProjectNodeFormProps) {
  const isChild = Boolean(project?.parentId || parent);
  const [name, setName] = useState(project?.name || "");
  const [quadrant, setQuadrant] = useState<ProjectQuadrant>(project?.quadrant || "important_not_urgent");
  const [nextAction, setNextAction] = useState(project?.nextAction || "");
  const [note, setNote] = useState(project?.note || project?.content || project?.description || "");
  const [isDelayed, setIsDelayed] = useState(project?.isDelayed === true);
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("项目名称是必填项。");
      return;
    }
    const trimmedNote = note.trim();
    onSubmit({
      ...(project || {
        type: parent?.type || "work",
        progress: 0,
        status: "未开始",
        executionSteps: [],
        startDate: "",
        dueDate: "",
        background: "",
        purpose: "",
        expectedResult: "",
        acceptanceCriteria: "",
        currentProgress: "",
        blockers: "",
        riskNotes: "",
        completionResult: "",
        retrospective: "",
      }),
      name: trimmedName,
      description: trimmedNote,
      content: trimmedNote,
      note: trimmedNote,
      currentProgress: project?.currentProgress || trimmedNote,
      nextAction: nextAction.trim(),
      isDelayed,
      quadrant: isChild ? project?.quadrant || parent?.quadrant || quadrant : quadrant,
      parentId: project?.parentId ?? parent?.id ?? null,
    });
  }

  return (
    <form className="form-stack project-node-form" onSubmit={submit}>
      <label>
        项目名称
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：PC 落地页" autoFocus required />
      </label>
      {!isChild && (
        <label>
          所属象限
          <select value={quadrant} onChange={(event) => setQuadrant(event.target.value as ProjectQuadrant)}>
            {PROJECT_QUADRANTS.map((item) => (
              <option key={item} value={item}>
                {quadrantLabels[item]}
              </option>
            ))}
          </select>
        </label>
      )}
      {isChild && <div className="readonly-field"><span>所属项目</span><strong>{getProjectPathLabel(parent || project)}</strong></div>}
      <label>
        下一步
        <textarea value={nextAction} onChange={(event) => setNextAction(event.target.value)} rows={3} placeholder="当前最值得优先处理的一件事" />
      </label>
      <label>
        备注
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} placeholder="记录背景、补充说明或风险信息" />
      </label>
      <label className="checkbox-field">
        <input type="checkbox" checked={isDelayed} onChange={(event) => setIsDelayed(event.target.checked)} />
        <span>延期</span>
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>取消</button>
        <button className="primary-button" type="submit">保存</button>
      </div>
    </form>
  );
}

function getProjectPathLabel(project?: Project): string {
  return project?.name || "未命名项目";
}
