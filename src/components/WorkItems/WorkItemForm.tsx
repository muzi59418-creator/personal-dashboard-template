import { useState } from "react";
import type { Category, Project, WorkItem, WorkItemInput, WorkStatus } from "../../types/dashboard";
import { WORK_STATUSES } from "../../types/dashboard";
import { todayInputValue } from "../../utils/date";
import { AttachmentField } from "../Common/AttachmentField";
import { DateInput } from "../Common/DateInput";

interface WorkItemFormProps {
  item?: WorkItem;
  initialInput?: Partial<WorkItemInput>;
  categories: Category[];
  projects: Project[];
  onCancel: () => void;
  onSubmit: (input: WorkItemInput) => void;
}

export function WorkItemForm({ item, initialInput, categories, projects, onCancel, onSubmit }: WorkItemFormProps) {
  const [title, setTitle] = useState(item?.title || initialInput?.title || "");
  const [categoryId, setCategoryId] = useState(item?.categoryId || initialInput?.categoryId || categories[0]?.id || "");
  const [status, setStatus] = useState<WorkStatus>(item?.status || initialInput?.status || "待处理");
  const [content, setContent] = useState(item?.content || initialInput?.content || "");
  const [date, setDate] = useState(item?.date || initialInput?.date || todayInputValue());
  const [plannedDate, setPlannedDate] = useState(item?.plannedDate || initialInput?.plannedDate || "");
  const [projectId, setProjectId] = useState(item?.projectId || initialInput?.projectId || "");
  const [images, setImages] = useState<string[]>(item?.images || initialInput?.images || []);
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!title.trim() || !categoryId || !content.trim() || !date) {
      setError("标题、分类、正文和日期都是必填项。");
      return;
    }
    onSubmit({
      title: title.trim(),
      categoryId,
      status,
      content: content.trim(),
      date,
      plannedDate,
      projectId,
      sourceTemplateId: item?.sourceTemplateId || initialInput?.sourceTemplateId,
      sourceTemplateType: item?.sourceTemplateType || initialInput?.sourceTemplateType,
      sourceTemplateName: item?.sourceTemplateName || initialInput?.sourceTemplateName,
      routineRuleId: item?.routineRuleId || initialInput?.routineRuleId,
      routineOriginalDate: item?.routineOriginalDate || initialInput?.routineOriginalDate,
      routineActualDate: item?.routineActualDate || initialInput?.routineActualDate,
      routineHolidayPostponed: item?.routineHolidayPostponed || initialInput?.routineHolidayPostponed,
      routineManualPostponed: item?.routineManualPostponed || initialInput?.routineManualPostponed,
      routineSkipped: item?.routineSkipped || initialInput?.routineSkipped,
      routineSkippedAt: item?.routineSkippedAt || initialInput?.routineSkippedAt,
      routineSkipReason: item?.routineSkipReason || initialInput?.routineSkipReason,
      routineMerged: item?.routineMerged || initialInput?.routineMerged,
      routineMergedTriggerDates: item?.routineMergedTriggerDates || initialInput?.routineMergedTriggerDates,
      routineDetachedFromRuleId: item?.routineDetachedFromRuleId || initialInput?.routineDetachedFromRuleId,
      completedAt: item?.completedAt || initialInput?.completedAt,
      images,
    });
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <label>
        标题
        <input value={title} onChange={(event) => setTitle(event.target.value)} required />
      </label>
      <div className="form-grid">
        <label>
          分类
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
            <option value="">请选择分类</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          状态
          <select value={status} onChange={(event) => setStatus(event.target.value as WorkStatus)}>
            {WORK_STATUSES.map((itemStatus) => (
              <option key={itemStatus} value={itemStatus}>
                {itemStatus}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        正文
        <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={5} required />
      </label>
      <div className="form-grid">
        <label>
          截止日期
          <DateInput value={date} onChange={(event) => setDate(event.target.value)} required />
          <span className="field-hint">最晚必须完成的日期。</span>
        </label>
        <label>
          计划执行日
          <DateInput value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} />
          <span className="field-hint">准备在哪天做，可留空。</span>
        </label>
      </div>
      <div className="form-grid">
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
