import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  Category,
  Project,
  RoutineWorkFrequency,
  RoutineWorkTemplate,
  RoutineWorkTemplateInput,
  WorkStatus,
} from "../../types/dashboard";
import { WORK_STATUSES } from "../../types/dashboard";
import { Modal } from "../Common/Modal";

interface RoutineWorkPanelProps {
  templates: RoutineWorkTemplate[];
  categories: Category[];
  projects: Project[];
  onCreate: (input: RoutineWorkTemplateInput) => void;
  onUpdate: (id: string, input: RoutineWorkTemplateInput, mode?: "future" | "sync_open") => void;
  onDelete: (id: string, action?: "keep" | "skip" | "delete") => void;
  onPause: (
    id: string,
    pendingTaskPolicy?: RoutineWorkTemplateInput["pendingTaskPolicy"],
    pausedUntil?: string,
    resumeStrategy?: RoutineWorkTemplateInput["resumeStrategy"],
  ) => void;
  onResume: (id: string, strategy?: RoutineWorkTemplateInput["resumeStrategy"]) => void;
  onGenerateToday: () => void;
}

const frequencyOptions: Array<{ value: RoutineWorkFrequency; label: string }> = [
  { value: "daily", label: "每天" },
  { value: "workday", label: "工作日" },
  { value: "weekly", label: "每周" },
  { value: "monthly", label: "每月" },
  { value: "custom", label: "自定义" },
];

const weekdayOptions = [
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
  { value: 7, label: "周日" },
];

export function RoutineWorkPanel({
  templates,
  categories,
  projects,
  onCreate,
  onUpdate,
  onDelete,
  onPause,
  onResume,
  onGenerateToday,
}: RoutineWorkPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const sortedTemplates = useMemo(() => [...templates].sort((a, b) => getTimeValue(a.createdAt) - getTimeValue(b.createdAt)), [templates]);
  const selectedTemplate = templates.find((template) => template.id === selectedId) || null;
  const editingTemplate = templates.find((template) => template.id === editingId) || null;
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const projectMap = new Map(projects.map((project) => [project.id, project.name]));

  function toggleTemplateEnabled(template: RoutineWorkTemplate) {
    onUpdate(template.id, toTemplateInput({ ...template, enabled: !template.enabled }));
  }

  function deleteTemplate(template: RoutineWorkTemplate) {
    if (!window.confirm("确认删除这个例行工作规则？未来不会再自动生成，已完成和已跳过历史会保留。")) return;
    const choice = window.prompt("已生成但未完成任务如何处理？输入 1 保留为普通待办，2 标记为已跳过，3 一并删除。", "1");
    const action = choice === "2" ? "skip" : choice === "3" ? "delete" : "keep";
    onDelete(template.id, action);
    setSelectedId("");
  }

  function pauseTemplate(template: RoutineWorkTemplate) {
    const pausedUntil = window.prompt("暂停至指定日期可填写 YYYY-MM-DD；留空表示手动恢复。", template.pausedUntil || "") || "";
    const pendingChoice = window.prompt("已生成但未完成任务如何处理？输入 1 保留待处理，2 标记为已跳过，3 顺延到恢复日。", "1");
    const pendingTaskPolicy = pendingChoice === "2" ? "skip" : pendingChoice === "3" ? "postpone_to_resume" : "keep";
    const resumeChoice = window.prompt("恢复方式：输入 1 恢复当天立即补生成，2 从下一个应执行日开始。", "1");
    const resumeStrategy = resumeChoice === "2" ? "next_due" : "resume_today";
    onPause(template.id, pendingTaskPolicy, pausedUntil, resumeStrategy);
    setSelectedId("");
  }

  function resumeTemplate(template: RoutineWorkTemplate) {
    const resumeChoice = window.prompt("恢复方式：输入 1 恢复当天立即补生成，2 从下一个应执行日开始。", template.resumeStrategy === "next_due" ? "2" : "1");
    onResume(template.id, resumeChoice === "2" ? "next_due" : "resume_today");
    setSelectedId("");
  }

  return (
    <section className="routine-work-panel">
      <div className="routine-work-head">
        <button className="routine-work-title-button" type="button" onClick={() => setExpanded((current) => !current)} aria-expanded={expanded}>
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <span>例行工作</span>
          <strong>{templates.length} 条</strong>
        </button>
        {expanded && (
          <button className="secondary-button" type="button" onClick={() => setCreating(true)}>
            <Plus size={16} />
            新增例行工作
          </button>
        )}
      </div>

      {expanded && (
        <div className="routine-work-content">
          <button className="primary-button routine-generate-button" type="button" onClick={onGenerateToday}>
            立即检查 / 同步例行工作
          </button>
          {sortedTemplates.length === 0 ? (
            <div className="routine-empty">暂无例行工作模板</div>
          ) : (
            <div className="routine-template-list">
              {sortedTemplates.map((template, index) => {
                const category = categoryMap.get(template.categoryId);
                return (
                  <button className="routine-template-row" type="button" key={template.id} onClick={() => setSelectedId(template.id)}>
                    <span className="routine-template-index">{index + 1}</span>
                    <strong>{template.name}</strong>
                    <span>{getFrequencyLabel(template)}</span>
                    <span className={`routine-enabled-label ${template.enabled && !template.paused ? "enabled" : ""}`}>
                      {getRuleStateLabel(template)}
                    </span>
                    {category && (
                      <span className="routine-category-dot" aria-label={category.name} style={{ background: category.color }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {creating && (
        <Modal title="新增例行工作" onClose={() => setCreating(false)}>
          <RoutineWorkForm
            categories={categories}
            projects={projects}
            onCancel={() => setCreating(false)}
            onSubmit={(input) => {
              onCreate(input);
              setCreating(false);
            }}
          />
        </Modal>
      )}

      {editingTemplate && (
        <Modal title="编辑例行工作" onClose={() => setEditingId("")}>
          <RoutineWorkForm
            template={editingTemplate}
            categories={categories}
            projects={projects}
            onCancel={() => setEditingId("")}
            onSubmit={(input) => {
              const sync = window.confirm("是否同步更新已生成但未完成、未跳过且未手动顺延的任务？\n确定：同步未完成任务\n取消：仅更新未来自动生成规则");
              onUpdate(editingTemplate.id, input, sync ? "sync_open" : "future");
              setEditingId("");
            }}
          />
        </Modal>
      )}

      {selectedTemplate && (
        <Modal title="例行工作详情" onClose={() => setSelectedId("")}>
          <div className="routine-detail">
            <DetailItem label="名称" value={selectedTemplate.name} />
            <DetailItem label="频率" value={getFrequencyLabel(selectedTemplate)} />
            <DetailItem label="默认状态" value={selectedTemplate.defaultStatus} />
            <DetailItem label="规则状态" value={getRuleStateDescription(selectedTemplate)} />
            <DetailItem label="生效日期" value={selectedTemplate.effectiveDate || "立即生效"} />
            <DetailItem label="结束日期" value={selectedTemplate.endDate || "长期执行"} />
            <DetailItem label="节假日处理" value={getHolidayPolicyLabel(selectedTemplate)} />
            <DetailItem label="分类" value={categoryMap.get(selectedTemplate.categoryId)?.name || "未设置"} />
            <DetailItem label="关联项目" value={projectMap.get(selectedTemplate.projectId) || "未关联"} />
            <DetailItem label="说明" value={selectedTemplate.description || "未填写"} wide />
            <DetailItem label="启用状态" value={selectedTemplate.enabled ? "已启用" : "已停用"} />
            <div className="routine-detail-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  setSelectedId("");
                  setEditingId(selectedTemplate.id);
                }}
              >
                编辑
              </button>
              <button className="secondary-button" type="button" onClick={() => toggleTemplateEnabled(selectedTemplate)}>
                {selectedTemplate.enabled ? "停用" : "启用"}
              </button>
              <button className="secondary-button" type="button" onClick={() => (selectedTemplate.paused ? resumeTemplate(selectedTemplate) : pauseTemplate(selectedTemplate))}>
                {selectedTemplate.paused ? "恢复" : "暂停"}
              </button>
              <button className="danger-button" type="button" onClick={() => deleteTemplate(selectedTemplate)}>
                删除
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

interface RoutineWorkFormProps {
  template?: RoutineWorkTemplate;
  categories: Category[];
  projects: Project[];
  onCancel: () => void;
  onSubmit: (input: RoutineWorkTemplateInput) => void;
}

function RoutineWorkForm({ template, categories, projects, onCancel, onSubmit }: RoutineWorkFormProps) {
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [categoryId, setCategoryId] = useState(template?.categoryId || "");
  const [projectId, setProjectId] = useState(template?.projectId || "");
  const [frequency, setFrequency] = useState<RoutineWorkFrequency>(template?.frequency || "workday");
  const [weekdays, setWeekdays] = useState<number[]>(template?.weekdays || [1]);
  const [monthlyDay, setMonthlyDay] = useState(template?.monthlyDay ? String(template.monthlyDay) : "");
  const [customDate, setCustomDate] = useState(template?.customDate || "");
  const [defaultStatus, setDefaultStatus] = useState<WorkStatus>(template?.defaultStatus || "待处理");
  const [enabled, setEnabled] = useState(template?.enabled ?? true);
  const [effectiveDate, setEffectiveDate] = useState(template?.effectiveDate || "");
  const [endDate, setEndDate] = useState(template?.endDate || "");
  const [dailyHolidayPolicy, setDailyHolidayPolicy] = useState(template?.dailyHolidayPolicy || "generate");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const selectedMonthlyDay = (event.currentTarget.elements.namedItem("monthlyDay") as HTMLSelectElement | null)?.value || monthlyDay;
    const selectedCustomDate = (event.currentTarget.elements.namedItem("customDate") as HTMLInputElement | null)?.value || customDate;
    if (!name.trim()) {
      setError("例行工作名称是必填项。");
      return;
    }
    if (frequency === "weekly" && weekdays.length === 0) {
      setError("每周重复时至少选择一个周几。");
      return;
    }
    if (frequency === "monthly" && !selectedMonthlyDay) {
      setError("每月重复时请选择每月执行日。");
      return;
    }
    if (frequency === "custom" && !selectedCustomDate) {
      setError("自定义重复时请选择执行日期。");
      return;
    }
    if (effectiveDate && endDate && effectiveDate > endDate) {
      setError("结束日期不能早于生效日期。");
      return;
    }
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      categoryId,
      projectId,
      frequency,
      weekdays: frequency === "weekly" ? weekdays : [],
      monthlyDay: frequency === "monthly" ? Number(selectedMonthlyDay) : null,
      customDate: frequency === "custom" ? selectedCustomDate : "",
      defaultStatus,
      enabled,
      effectiveDate,
      endDate,
      paused: template?.paused || false,
      pausedUntil: template?.pausedUntil || "",
      pauseResumeMode: template?.pauseResumeMode || "manual",
      resumeStrategy: template?.resumeStrategy || "resume_today",
      pendingTaskPolicy: template?.pendingTaskPolicy || "keep",
      dailyHolidayPolicy: frequency === "daily" ? dailyHolidayPolicy : "postpone",
      source: template?.source || "local",
    });
  }

  function toggleWeekday(value: number) {
    setWeekdays((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value].sort((a, b) => a - b)));
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <label>
        例行工作名称
        <input value={name} onChange={(event) => setName(event.target.value)} required />
      </label>
      <label>
        工作说明
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
      </label>
      <div className="form-grid">
        <label>
          默认分类
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">不设置</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
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
      <div className="form-grid">
        <label>
          重复频率
          <select value={frequency} onChange={(event) => setFrequency(event.target.value as RoutineWorkFrequency)}>
            {frequencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          默认状态
          <select value={defaultStatus} onChange={(event) => setDefaultStatus(event.target.value as WorkStatus)}>
            {WORK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label>
          生效日期
          <input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} />
          <span className="field-hint">留空表示立即生效。</span>
        </label>
        <label>
          结束日期
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          <span className="field-hint">留空表示长期执行。</span>
        </label>
      </div>
      {frequency === "daily" && (
        <fieldset>
          <legend>法定节假日处理</legend>
          <div className="segmented-control">
            <button className={dailyHolidayPolicy === "generate" ? "active" : ""} type="button" onClick={() => setDailyHolidayPolicy("generate")}>
              假期仍生成
            </button>
            <button className={dailyHolidayPolicy === "postpone" ? "active" : ""} type="button" onClick={() => setDailyHolidayPolicy("postpone")}>
              假期顺延
            </button>
          </div>
          <span className="field-hint">“假期顺延”会把连续法定假期合并补到节后首个中国法定工作日。</span>
        </fieldset>
      )}
      <div className="routine-rule-note">
        {template?.paused ? `当前已暂停${template.pausedUntil ? `，暂停至 ${template.pausedUntil}` : "，需手动恢复"}` : "当前未暂停。"}
      </div>
      {frequency === "weekly" && (
        <fieldset>
          <legend>每周重复</legend>
          <div className="checkbox-grid weekday-grid">
            {weekdayOptions.map((option) => (
              <label className="checkbox-line" key={option.value}>
                <input type="checkbox" checked={weekdays.includes(option.value)} onChange={() => toggleWeekday(option.value)} />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {frequency === "monthly" && (
        <label>
          每月执行日
          <select name="monthlyDay" value={monthlyDay} onChange={(event) => setMonthlyDay(event.target.value)} required>
            <option value="">请选择</option>
            {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
              <option key={day} value={day}>
                {day} 日
              </option>
            ))}
          </select>
        </label>
      )}
      {frequency === "custom" && (
        <label>
          执行日期
          <input
            name="customDate"
            type="date"
            value={customDate}
            onChange={(event) => setCustomDate(event.target.value)}
            onInput={(event) => setCustomDate(event.currentTarget.value)}
            required
          />
        </label>
      )}
      <fieldset>
        <legend>是否启用</legend>
        <div className="segmented-control">
          <button className={enabled ? "active" : ""} type="button" onClick={() => setEnabled(true)}>
            启用
          </button>
          <button className={!enabled ? "active" : ""} type="button" onClick={() => setEnabled(false)}>
            停用
          </button>
        </div>
      </fieldset>
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

function DetailItem({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`routine-detail-item ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function toTemplateInput(template: RoutineWorkTemplate): RoutineWorkTemplateInput {
  return {
    name: template.name,
    description: template.description,
    categoryId: template.categoryId,
    projectId: template.projectId,
    frequency: template.frequency,
    weekdays: template.weekdays,
    monthlyDay: template.monthlyDay,
    customDate: template.customDate,
    defaultStatus: template.defaultStatus,
    enabled: template.enabled,
    effectiveDate: template.effectiveDate || "",
    endDate: template.endDate || "",
    paused: template.paused || false,
    pausedUntil: template.pausedUntil || "",
    pauseResumeMode: template.pauseResumeMode || "manual",
    resumeStrategy: template.resumeStrategy || "resume_today",
    pendingTaskPolicy: template.pendingTaskPolicy || "keep",
    dailyHolidayPolicy: template.dailyHolidayPolicy || "generate",
    source: template.source || "local",
  };
}

function getFrequencyLabel(template: RoutineWorkTemplate) {
  if (template.frequency === "daily") return "每天";
  if (template.frequency === "workday") return "中国法定工作日";
  if (template.frequency === "monthly") return template.monthlyDay ? `每月 ${template.monthlyDay} 日` : "每月";
  if (template.frequency === "custom") return template.customDate ? `自定义 · ${template.customDate}` : "自定义";
  const labels = template.weekdays.map((weekday) => weekdayOptions.find((option) => option.value === weekday)?.label).filter(Boolean);
  return labels.length > 0 ? `每周 ${labels.join("、")}` : "每周";
}

function getRuleStateLabel(template: RoutineWorkTemplate): string {
  if (!template.enabled) return "已停用";
  if (template.paused) return "已暂停";
  return "已启用";
}

function getRuleStateDescription(template: RoutineWorkTemplate): string {
  if (!template.enabled) return "已停用，不会继续自动生成。";
  if (template.paused) return template.pausedUntil ? `暂停中，将在 ${template.pausedUntil} 自动恢复。` : "暂停中，需要手动恢复。";
  return "已启用，按规则日期自动生成。";
}

function getHolidayPolicyLabel(template: RoutineWorkTemplate): string {
  if (template.frequency === "daily") return template.dailyHolidayPolicy === "postpone" ? "法定节假日不生成，顺延至节后首个中国法定工作日" : "假期仍生成";
  if (template.frequency === "workday") return "按中国法定工作日生成，法定节假日顺延";
  return "原定触发日遇法定节假日时顺延";
}

function getTimeValue(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}
