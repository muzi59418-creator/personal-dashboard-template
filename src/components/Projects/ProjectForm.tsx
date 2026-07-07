import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Project, ProjectInput, ProjectQuadrant, ProjectStatus, ProjectStep, ProjectStepStatus, ProjectType } from "../../types/dashboard";
import { PROJECT_QUADRANTS, PROJECT_STATUSES, PROJECT_STEP_STATUSES } from "../../types/dashboard";
import { createId } from "../../utils/id";
import { getProjectProgressSummary } from "../../utils/projectProgress";
import { DateInput } from "../Common/DateInput";

interface ProjectFormProps {
  project?: Project;
  onCancel: () => void;
  onSubmit: (input: ProjectInput) => void;
}

const quadrantLabels: Record<ProjectQuadrant, string> = {
  important_urgent: "重要且紧急",
  important_not_urgent: "重要但不紧急",
  urgent_not_important: "紧急但不重要",
  not_important_not_urgent: "不重要且不紧急",
};

const stepStatusLabels: Record<ProjectStepStatus, string> = {
  todo: "待处理",
  doing: "进行中",
  done: "已完成",
};

export function ProjectForm({ project, onCancel, onSubmit }: ProjectFormProps) {
  const [name, setName] = useState(project?.name || "");
  const [type, setType] = useState<ProjectType>(project?.type || "work");
  const [status, setStatus] = useState<ProjectStatus>(project?.status || "未开始");
  const [quadrant, setQuadrant] = useState<ProjectQuadrant>(project?.quadrant || "important_not_urgent");
  const [startDate, setStartDate] = useState(project?.startDate || "");
  const [dueDate, setDueDate] = useState(project?.dueDate || "");
  const [background, setBackground] = useState(project?.background || project?.description || "");
  const [purpose, setPurpose] = useState(project?.purpose || "");
  const [expectedResult, setExpectedResult] = useState(project?.expectedResult || "");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(project?.acceptanceCriteria || "");
  const [executionSteps, setExecutionSteps] = useState<ProjectStep[]>(project?.executionSteps || []);
  const [currentProgress, setCurrentProgress] = useState(project?.currentProgress || project?.content || "");
  const [nextAction, setNextAction] = useState(project?.nextAction || "");
  const [blockers, setBlockers] = useState(project?.blockers || "");
  const [riskNotes, setRiskNotes] = useState(project?.riskNotes || "");
  const [completionResult, setCompletionResult] = useState(project?.completionResult || "");
  const [retrospective, setRetrospective] = useState(project?.retrospective || "");
  const [error, setError] = useState("");
  const progressSummary = getProjectProgressSummary({ executionSteps });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("项目名称是必填项。");
      return;
    }
    const description = background.trim() || purpose.trim() || expectedResult.trim();
    onSubmit({
      name: name.trim(),
      type,
      status,
      quadrant,
      progress: project?.progress || 0,
      startDate,
      dueDate,
      description,
      content: currentProgress.trim(),
      background: background.trim(),
      purpose: purpose.trim(),
      expectedResult: expectedResult.trim(),
      acceptanceCriteria: acceptanceCriteria.trim(),
      executionSteps,
      currentProgress: currentProgress.trim(),
      nextAction: nextAction.trim(),
      blockers: blockers.trim(),
      riskNotes: riskNotes.trim(),
      completionResult: completionResult.trim(),
      retrospective: retrospective.trim(),
    });
  }

  function addStep() {
    setExecutionSteps((current) => [
      ...current,
      { id: createId("step"), name: "", description: "", status: "todo", dueDate: "", completedAt: "" },
    ]);
  }

  function updateStep(stepId: string, patch: Partial<ProjectStep>) {
    setExecutionSteps((current) => current.map((step) => (step.id === stepId ? { ...step, ...patch } : step)));
  }

  function deleteStep(stepId: string) {
    if (!window.confirm("确认删除这个推进事项？已关联的工作内容会继续保留。")) return;
    setExecutionSteps((current) => current.filter((step) => step.id !== stepId));
  }

  return (
    <form className="form-stack project-form" onSubmit={submit}>
      <ProjectFormSection title="基础信息">
        <label>
          项目名称
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <div className="form-grid">
          <label>
            项目类型
            <select value={type} onChange={(event) => setType(event.target.value as ProjectType)}>
              <option value="work">工作项目</option>
              <option value="personal">个人项目</option>
            </select>
          </label>
          <label>
            项目状态
            <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)}>
              {PROJECT_STATUSES.map((projectStatus) => (
                <option key={projectStatus} value={projectStatus}>
                  {projectStatus}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            四象限归属
            <select value={quadrant} onChange={(event) => setQuadrant(event.target.value as ProjectQuadrant)}>
              {PROJECT_QUADRANTS.map((item) => (
                <option key={item} value={item}>
                  {quadrantLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <div className="readonly-field">
            <span>项目进度</span>
            <strong>{progressSummary.hasProgressItems ? `${progressSummary.percent}%` : progressSummary.label}</strong>
            {progressSummary.hasProgressItems && <small>{progressSummary.detail}</small>}
          </div>
        </div>
        <div className="form-grid">
          <label>
            开始时间
            <DateInput value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label>
            截止时间
            <DateInput value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>
        </div>
      </ProjectFormSection>

      <ProjectFormSection title="项目背景与目标">
        <label>
          项目背景
          <textarea value={background} onChange={(event) => setBackground(event.target.value)} rows={3} />
        </label>
        <label>
          项目目的
          <textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={3} />
        </label>
        <div className="form-grid">
          <label>
            预期结果
            <textarea value={expectedResult} onChange={(event) => setExpectedResult(event.target.value)} rows={3} />
          </label>
          <label>
            验收标准 / 完成定义
            <textarea value={acceptanceCriteria} onChange={(event) => setAcceptanceCriteria(event.target.value)} rows={3} />
          </label>
        </div>
      </ProjectFormSection>

      <ProjectFormSection title="项目推进清单">
        <div className="step-list">
          {executionSteps.map((step, index) => (
            <div className="project-step-editor" key={step.id}>
              <div className="project-step-editor-head">
                <strong>推进事项 {index + 1}</strong>
                <button className="icon-button danger-icon" type="button" aria-label="删除推进事项" title="删除推进事项" onClick={() => deleteStep(step.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
              <label>
                事项名称
                <input value={step.name} onChange={(event) => updateStep(step.id, { name: event.target.value })} />
              </label>
              <label>
                事项说明
                <textarea value={step.description} onChange={(event) => updateStep(step.id, { description: event.target.value })} rows={2} />
              </label>
              <div className="form-grid">
                <label>
                  事项状态
                  <select value={step.status} onChange={(event) => updateStep(step.id, { status: event.target.value as ProjectStepStatus })}>
                    {PROJECT_STEP_STATUSES.map((stepStatus) => (
                      <option key={stepStatus} value={stepStatus}>
                        {stepStatusLabels[stepStatus]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  截止时间
                  <DateInput value={step.dueDate} onChange={(event) => updateStep(step.id, { dueDate: event.target.value })} />
                </label>
              </div>
              <label>
                完成时间
                <DateInput value={step.completedAt} onChange={(event) => updateStep(step.id, { completedAt: event.target.value })} />
              </label>
            </div>
          ))}
        </div>
        {executionSteps.length === 0 && <p className="muted-text">未拆分推进事项。</p>}
        <button className="secondary-button" type="button" onClick={addStep}>
          <Plus size={16} />
          新增推进事项
        </button>
      </ProjectFormSection>

      <ProjectFormSection title="进度追踪">
        <label>
          当前进展
          <textarea value={currentProgress} onChange={(event) => setCurrentProgress(event.target.value)} rows={4} />
        </label>
        <div className="form-grid">
          <label>
            下一步动作
            <textarea value={nextAction} onChange={(event) => setNextAction(event.target.value)} rows={3} />
          </label>
          <label>
            阻塞问题
            <textarea value={blockers} onChange={(event) => setBlockers(event.target.value)} rows={3} />
          </label>
        </div>
        <label>
          风险备注
          <textarea value={riskNotes} onChange={(event) => setRiskNotes(event.target.value)} rows={3} />
        </label>
      </ProjectFormSection>

      <ProjectFormSection title="关联内容">
        <p className="muted-text">关联内容由工作内容、工作日记和图文记录反向汇总，不在项目表单中手动维护。</p>
      </ProjectFormSection>

      <ProjectFormSection title="完成复盘">
        <div className="form-grid">
          <label>
            完成结果
            <textarea value={completionResult} onChange={(event) => setCompletionResult(event.target.value)} rows={3} />
          </label>
          <label>
            复盘总结
            <textarea value={retrospective} onChange={(event) => setRetrospective(event.target.value)} rows={3} />
          </label>
        </div>
      </ProjectFormSection>

      {error && <p className="form-error">{error}</p>}
      <div className="form-actions sticky-form-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          取消
        </button>
        <button className="primary-button" type="submit">
          保存项目
        </button>
      </div>
    </form>
  );
}

function ProjectFormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="project-form-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function getProjectQuadrantLabel(quadrant: ProjectQuadrant = "important_not_urgent") {
  return quadrantLabels[quadrant];
}

export function getProjectStepStatusLabel(status: ProjectStepStatus) {
  return stepStatusLabels[status];
}
