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
  onUpdate: (id: string, input: RoutineWorkTemplateInput) => void;
  onDelete: (id: string) => void;
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
    if (!window.confirm("确认删除这个例行工作模板？已经生成的历史工作内容不会被删除。")) return;
    onDelete(template.id);
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
            生成今日例行工作
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
                    <span className={`routine-enabled-label ${template.enabled ? "enabled" : ""}`}>{template.enabled ? "已启用" : "已停用"}</span>
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
              onUpdate(editingTemplate.id, input);
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
  };
}

function getFrequencyLabel(template: RoutineWorkTemplate) {
  if (template.frequency === "daily") return "每天";
  if (template.frequency === "workday") return "工作日";
  if (template.frequency === "monthly") return template.monthlyDay ? `每月 ${template.monthlyDay} 日` : "每月";
  if (template.frequency === "custom") return template.customDate ? `自定义 · ${template.customDate}` : "自定义";
  const labels = template.weekdays.map((weekday) => weekdayOptions.find((option) => option.value === weekday)?.label).filter(Boolean);
  return labels.length > 0 ? `每周 ${labels.join("、")}` : "每周";
}

function getTimeValue(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}
