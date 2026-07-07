import { Copy, Edit3, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Category, Project, WorkStatus, WorkTemplate, WorkTemplateDateRule, WorkTemplateInput } from "../../types/dashboard";
import { WORK_STATUSES } from "../../types/dashboard";

interface WorkTemplateManagerProps {
  templates: WorkTemplate[];
  categories: Category[];
  projects: Project[];
  onCreate: (input: WorkTemplateInput) => void;
  onUpdate: (id: string, input: WorkTemplateInput) => void;
  onDelete: (id: string) => void;
  onReorder: (templateIds: string[]) => void;
}

const dateRuleOptions: Array<{ value: WorkTemplateDateRule; label: string }> = [
  { value: "", label: "不预填" },
  { value: "today", label: "当天" },
  { value: "tomorrow", label: "明天" },
  { value: "next_workday", label: "下一个工作日" },
  { value: "next_week", label: "一周后" },
];

export function WorkTemplateManager({
  templates,
  categories,
  projects,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
}: WorkTemplateManagerProps) {
  const sortedTemplates = useMemo(() => [...templates].sort((a, b) => a.sortOrder - b.sortOrder), [templates]);
  const [editingId, setEditingId] = useState<string | "new">("");
  const editingTemplate = editingId && editingId !== "new" ? templates.find((template) => template.id === editingId) || null : null;

  function toInput(template: WorkTemplate): WorkTemplateInput {
    return {
      name: template.name,
      defaultTitle: template.defaultTitle,
      defaultCategoryId: template.defaultCategoryId,
      defaultStatus: template.defaultStatus,
      defaultProjectId: template.defaultProjectId,
      defaultContent: template.defaultContent,
      plannedDateRule: template.plannedDateRule,
      dueDateRule: template.dueDateRule,
      enabled: template.enabled,
      sortOrder: template.sortOrder,
    };
  }

  function moveTemplate(index: number, direction: -1 | 1) {
    const next = [...sortedTemplates];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onReorder(next.map((template) => template.id));
  }

  function duplicateTemplate(template: WorkTemplate) {
    onCreate({
      ...toInput(template),
      name: `${template.name} 副本`,
      sortOrder: getNextSortOrder(templates),
      enabled: true,
    });
  }

  function toggleTemplate(template: WorkTemplate) {
    onUpdate(template.id, { ...toInput(template), enabled: !template.enabled });
  }

  return (
    <div className="template-manager">
      <div className="template-manager-head">
        <button className="primary-button" type="button" onClick={() => setEditingId("new")}>
          新增模板
        </button>
      </div>
      {sortedTemplates.length === 0 ? (
        <div className="routine-empty">暂无工作模板</div>
      ) : (
        <div className="template-list">
          {sortedTemplates.map((template, index) => (
            <article className="template-row" key={template.id}>
              <div className="template-row-main">
                <strong>{template.name}</strong>
                <span>{template.defaultTitle || "未设置默认标题"}</span>
                <span>{template.enabled ? "已启用" : "已停用"}</span>
              </div>
              <div className="template-row-actions">
                <button className="secondary-button compact-button" type="button" onClick={() => moveTemplate(index, -1)} disabled={index === 0}>
                  上移
                </button>
                <button
                  className="secondary-button compact-button"
                  type="button"
                  onClick={() => moveTemplate(index, 1)}
                  disabled={index === sortedTemplates.length - 1}
                >
                  下移
                </button>
                <button className="secondary-button icon-only-button" type="button" title="编辑" onClick={() => setEditingId(template.id)}>
                  <Edit3 size={15} />
                </button>
                <button className="secondary-button icon-only-button" type="button" title="复制" onClick={() => duplicateTemplate(template)}>
                  <Copy size={15} />
                </button>
                <button className="secondary-button icon-only-button" type="button" title={template.enabled ? "停用" : "启用"} onClick={() => toggleTemplate(template)}>
                  {template.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                </button>
                <button
                  className="danger-button icon-only-button"
                  type="button"
                  title="删除"
                  onClick={() => {
                    if (window.confirm("确认删除这个工作模板？已经通过它创建的工作不会被删除。")) onDelete(template.id);
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editingId && (
        <WorkTemplateForm
          template={editingTemplate || undefined}
          categories={categories}
          projects={projects}
          nextSortOrder={getNextSortOrder(templates)}
          onCancel={() => setEditingId("")}
          onSubmit={(input) => {
            if (editingTemplate) {
              onUpdate(editingTemplate.id, input);
            } else {
              onCreate(input);
            }
            setEditingId("");
          }}
        />
      )}
    </div>
  );
}

interface WorkTemplateFormProps {
  template?: WorkTemplate;
  categories: Category[];
  projects: Project[];
  nextSortOrder: number;
  onCancel: () => void;
  onSubmit: (input: WorkTemplateInput) => void;
}

function WorkTemplateForm({ template, categories, projects, nextSortOrder, onCancel, onSubmit }: WorkTemplateFormProps) {
  const [name, setName] = useState(template?.name || "");
  const [defaultTitle, setDefaultTitle] = useState(template?.defaultTitle || "");
  const [defaultCategoryId, setDefaultCategoryId] = useState(template?.defaultCategoryId || "");
  const [defaultStatus, setDefaultStatus] = useState<WorkStatus>(template?.defaultStatus || "待处理");
  const [defaultProjectId, setDefaultProjectId] = useState(template?.defaultProjectId || "");
  const [defaultContent, setDefaultContent] = useState(template?.defaultContent || "");
  const [plannedDateRule, setPlannedDateRule] = useState<WorkTemplateDateRule>(template?.plannedDateRule || "");
  const [dueDateRule, setDueDateRule] = useState<WorkTemplateDateRule>(template?.dueDateRule || "");
  const [enabled, setEnabled] = useState(template?.enabled ?? true);
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("模板名称是必填项。");
      return;
    }
    onSubmit({
      name: name.trim(),
      defaultTitle: defaultTitle.trim(),
      defaultCategoryId,
      defaultStatus,
      defaultProjectId,
      defaultContent: defaultContent.trim(),
      plannedDateRule,
      dueDateRule,
      enabled,
      sortOrder: template?.sortOrder || nextSortOrder,
    });
  }

  return (
    <form className="form-stack template-form-panel" onSubmit={submit}>
      <label>
        模板名称
        <input value={name} onChange={(event) => setName(event.target.value)} required />
      </label>
      <label>
        默认标题
        <input value={defaultTitle} onChange={(event) => setDefaultTitle(event.target.value)} />
      </label>
      <div className="form-grid">
        <label>
          默认分类
          <select value={defaultCategoryId} onChange={(event) => setDefaultCategoryId(event.target.value)}>
            <option value="">不预设</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
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
      <label>
        默认关联项目
        <select value={defaultProjectId} onChange={(event) => setDefaultProjectId(event.target.value)}>
          <option value="">不关联</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        默认描述 / 填写提示
        <textarea value={defaultContent} onChange={(event) => setDefaultContent(event.target.value)} rows={4} />
      </label>
      <div className="form-grid">
        <label>
          默认计划执行日规则
          <select value={plannedDateRule} onChange={(event) => setPlannedDateRule(event.target.value as WorkTemplateDateRule)}>
            {dateRuleOptions.map((option) => (
              <option key={option.value || "empty"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          默认截止日期规则
          <select value={dueDateRule} onChange={(event) => setDueDateRule(event.target.value as WorkTemplateDateRule)}>
            {dateRuleOptions.map((option) => (
              <option key={option.value || "empty"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend>启用状态</legend>
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

function getNextSortOrder(templates: WorkTemplate[]) {
  return templates.reduce((max, template) => Math.max(max, template.sortOrder || 0), 0) + 10;
}

