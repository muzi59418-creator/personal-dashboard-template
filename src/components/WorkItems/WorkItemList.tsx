import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus, Tags } from "lucide-react";
import type {
  Category,
  CategoryInput,
  Project,
  RoutineWorkTemplate,
  RoutineWorkTemplateInput,
  WorkTemplate,
  WorkTemplateDateRule,
  WorkTemplateInput,
  WorkItem,
  WorkItemInput,
  WorkResponsibilityGroup,
} from "../../types/dashboard";
import { WORK_STATUSES } from "../../types/dashboard";
import { formatDate, formatDateTime, formatWeekday, todayInputValue } from "../../utils/date";
import { CategoryManager } from "../Categories/CategoryManager";
import { DateInput } from "../Common/DateInput";
import { EmptyState } from "../Common/EmptyState";
import { Modal } from "../Common/Modal";
import { WorkItemDetailModal } from "./WorkItemDetailModal";
import { WorkItemForm } from "./WorkItemForm";
import { RoutineWorkPanel } from "./RoutineWorkPanel";
import { WorkTemplateManager } from "./WorkTemplateManager";
import { WorkResponsibilitiesPanel } from "./WorkResponsibilitiesPanel";
import { WorkStatusSelect } from "./WorkStatusSelect";

interface WorkItemListProps {
  items: WorkItem[];
  categories: Category[];
  projects: Project[];
  responsibilities: WorkResponsibilityGroup[];
  routineWorkTemplates: RoutineWorkTemplate[];
  workTemplates: WorkTemplate[];
  onCreate: (input: WorkItemInput) => void;
  onUpdate: (id: string, input: WorkItemInput) => void;
  onDelete: (id: string) => void;
  onUpdateResponsibilities: (groups: WorkResponsibilityGroup[]) => void;
  onCreateRoutineWork: (input: RoutineWorkTemplateInput) => void;
  onUpdateRoutineWork: (id: string, input: RoutineWorkTemplateInput) => void;
  onDeleteRoutineWork: (id: string) => void;
  onGenerateRoutineWork: () => void;
  onCreateWorkTemplate: (input: WorkTemplateInput) => void;
  onUpdateWorkTemplate: (id: string, input: WorkTemplateInput) => void;
  onDeleteWorkTemplate: (id: string) => void;
  onReorderWorkTemplates: (templateIds: string[]) => void;
  onCreateCategory: (input: CategoryInput) => void;
  onUpdateCategory: (id: string, input: CategoryInput) => void;
  onDeleteCategory: (id: string) => void;
}

export function WorkItemList({
  items,
  categories,
  projects,
  responsibilities,
  routineWorkTemplates,
  workTemplates,
  onCreate,
  onUpdate,
  onDelete,
  onUpdateResponsibilities,
  onCreateRoutineWork,
  onUpdateRoutineWork,
  onDeleteRoutineWork,
  onGenerateRoutineWork,
  onCreateWorkTemplate,
  onUpdateWorkTemplate,
  onDeleteWorkTemplate,
  onReorderWorkTemplates,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: WorkItemListProps) {
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [plannedDateFilter, setPlannedDateFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [createInitialInput, setCreateInitialInput] = useState<Partial<WorkItemInput> | undefined>();
  const [selectedItemId, setSelectedItemId] = useState("");
  const [editingDetail, setEditingDetail] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const projectMap = new Map(projects.map((project) => [project.id, project.name]));
  const selectedItem = items.find((item) => item.id === selectedItemId) || null;

  useEffect(() => {
    if (selectedItemId && !selectedItem) setSelectedItemId("");
  }, [selectedItemId, selectedItem]);

  const groupedItems = useMemo(() => {
    const visibleItems = items
      .filter((item) => {
        if (categoryFilter && item.categoryId !== categoryFilter) return false;
        if (statusFilter && item.status !== statusFilter) return false;
        if (projectFilter && item.projectId !== projectFilter) return false;
        if (dateFilter && item.date !== dateFilter) return false;
        if (plannedDateFilter && item.plannedDate !== plannedDateFilter) return false;
        return true;
      })
      .sort(compareWorkItems);

    const groups = new Map<string, WorkItem[]>();
    visibleItems.forEach((item) => {
      const dateKey = item.date || "";
      groups.set(dateKey, [...(groups.get(dateKey) || []), item]);
    });

    return Array.from(groups, ([date, groupItems]) => ({ date, items: groupItems }));
  }, [categoryFilter, dateFilter, items, plannedDateFilter, projectFilter, statusFilter]);

  function clearFilters() {
    setCategoryFilter("");
    setStatusFilter("");
    setProjectFilter("");
    setDateFilter("");
    setPlannedDateFilter("");
  }

  function openBlankCreate() {
    setCreateInitialInput(undefined);
    setCreating(true);
    setCreateMenuOpen(false);
  }

  function openTemplatePicker() {
    setTemplatePickerOpen(true);
    setCreateMenuOpen(false);
  }

  function openTemplateManager() {
    setTemplateManagerOpen(true);
    setCreateMenuOpen(false);
  }

  function startCreateFromTemplate(template: WorkTemplate) {
    setCreateInitialInput(buildWorkInputFromTemplate(template, categories[0]?.id || ""));
    setTemplatePickerOpen(false);
    setCreating(true);
  }

  return (
    <section className="page-section">
      <div className="page-head">
        <div>
          <h2>工作内容</h2>
        </div>
      </div>
      <WorkResponsibilitiesPanel responsibilities={responsibilities} onSave={onUpdateResponsibilities} />
      <RoutineWorkPanel
        templates={routineWorkTemplates}
        categories={categories}
        projects={projects}
        onCreate={onCreateRoutineWork}
        onUpdate={onUpdateRoutineWork}
        onDelete={onDeleteRoutineWork}
        onGenerateToday={onGenerateRoutineWork}
      />
      <div className="toolbar work-filter-toolbar">
        <select className="filter-control" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="分类筛选">
          <option value="">全部分类</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select className="filter-control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="状态筛选">
          <option value="">全部状态</option>
          {WORK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select className="filter-control" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} aria-label="关联项目筛选">
          <option value="">全部项目</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <DateInput className="filter-control" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="截止日期筛选" />
        <DateInput
          className="filter-control"
          value={plannedDateFilter}
          onChange={(event) => setPlannedDateFilter(event.target.value)}
          aria-label="计划执行日筛选"
        />
        <button className="secondary-button" type="button" onClick={clearFilters}>
          查看全部
        </button>
        <button className="secondary-button" type="button" onClick={() => setCategoryManagerOpen(true)}>
          <Tags size={16} />
          分类管理
        </button>
        <div className="add-work-menu">
          <button className="primary-button" type="button" onClick={() => setCreateMenuOpen((current) => !current)}>
            <Plus size={16} />
            新增工作
            <ChevronDown size={15} />
          </button>
          {createMenuOpen && (
            <div className="dropdown-menu add-work-dropdown">
              <button type="button" onClick={openBlankCreate}>
                空白新增工作
              </button>
              <button type="button" onClick={openTemplatePicker}>
                从模板创建
              </button>
              <button type="button" onClick={openTemplateManager}>
                管理模板
              </button>
            </div>
          )}
        </div>
      </div>
      {groupedItems.length === 0 ? (
        <EmptyState title="暂无工作内容" description="新增一条待处理事项，或调整筛选条件。" />
      ) : (
        <div className="timeline-list">
          {groupedItems.map((group) => (
            <section className="timeline-group" key={group.date || "no-date"}>
              <div className="timeline-marker" aria-hidden="true" />
              <div className="timeline-content">
                <div className="timeline-heading">
                  <h3>{formatDate(group.date)}</h3>
                  {group.date && <span>{formatWeekday(group.date)}</span>}
                  <strong>{group.items.length} 条工作</strong>
                </div>
                <div className="timeline-card-list">
                  {group.items.map((item, index) => {
                    const category = categoryMap.get(item.categoryId);
                    return (
                      <article
                        className="list-card work-row-button timeline-card"
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedItemId(item.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedItemId(item.id);
                          }
                        }}
                      >
                        <div>
                          <h3 className="work-item-title">
                            <span className="work-item-index" aria-hidden="true">
                              {index + 1}
                            </span>
                            <span>{item.title}</span>
                          </h3>
                          <p>{item.content}</p>
                          <div className="chip-row">
                            <WorkStatusSelect item={item} onUpdate={onUpdate} />
                            {category && (
                              <span className="chip outline">
                                <span className="mini-dot" style={{ background: category.color }} />
                                {category.name}
                              </span>
                            )}
                            {item.projectId && <span className="chip outline">{projectMap.get(item.projectId) || "关联项目"}</span>}
                            {item.plannedDate && <span className="chip outline">计划 {formatDate(item.plannedDate)}</span>}
                            {item.sourceTemplateType === "work" && <span className="chip outline">模板：{item.sourceTemplateName || "已删除模板"}</span>}
                            {(item.images?.length || 0) > 0 && <span className="chip outline">{item.images?.length || 0} 张图片</span>}
                            <span className="chip outline">更新 {formatDateTime(item.updatedAt || item.createdAt)}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {creating && (
        <Modal
          title={createInitialInput?.sourceTemplateName ? `从模板创建：${createInitialInput.sourceTemplateName}` : "新增工作内容"}
          onClose={() => setCreating(false)}
        >
          <WorkItemForm
            categories={categories}
            projects={projects}
            initialInput={createInitialInput}
            onCancel={() => setCreating(false)}
            onSubmit={(input) => {
              onCreate(input);
              setCreating(false);
              setCreateInitialInput(undefined);
            }}
          />
        </Modal>
      )}

      {templatePickerOpen && (
        <Modal title="选择工作模板" onClose={() => setTemplatePickerOpen(false)}>
          <div className="template-picker-list">
            {workTemplates.filter((template) => template.enabled).length === 0 ? (
              <EmptyState title="暂无可用模板" description="可以先进入模板管理新增或启用模板。" />
            ) : (
              [...workTemplates]
                .filter((template) => template.enabled)
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((template) => (
                  <button className="template-picker-row" type="button" key={template.id} onClick={() => startCreateFromTemplate(template)}>
                    <strong>{template.name}</strong>
                    <span>{template.defaultTitle || "未设置默认标题"}</span>
                  </button>
                ))
            )}
          </div>
        </Modal>
      )}

      {templateManagerOpen && (
        <Modal title="管理工作模板" onClose={() => setTemplateManagerOpen(false)}>
          <WorkTemplateManager
            templates={workTemplates}
            categories={categories}
            projects={projects}
            onCreate={onCreateWorkTemplate}
            onUpdate={onUpdateWorkTemplate}
            onDelete={onDeleteWorkTemplate}
            onReorder={onReorderWorkTemplates}
          />
        </Modal>
      )}

      {selectedItem && (
        <WorkItemDetailModal
          item={selectedItem}
          categories={categories}
          projects={projects}
          editing={editingDetail}
          onEdit={() => setEditingDetail(true)}
          onCancelEdit={() => setEditingDetail(false)}
          onClose={() => {
            setSelectedItemId("");
            setEditingDetail(false);
          }}
          onUpdate={(input) => {
            onUpdate(selectedItem.id, input);
            setEditingDetail(false);
          }}
          onDelete={() => {
            onDelete(selectedItem.id);
            setSelectedItemId("");
            setEditingDetail(false);
          }}
        />
      )}

      {categoryManagerOpen && (
        <Modal title="分类管理" onClose={() => setCategoryManagerOpen(false)}>
          <CategoryManager
            categories={categories}
            workItems={items}
            compact
            onCreate={onCreateCategory}
            onUpdate={onUpdateCategory}
            onDelete={onDeleteCategory}
          />
        </Modal>
      )}
    </section>
  );
}

function compareWorkItems(a: WorkItem, b: WorkItem): number {
  const dateCompare = b.date.localeCompare(a.date);
  if (dateCompare !== 0) return dateCompare;

  const aTime = getCreatedTime(a);
  const bTime = getCreatedTime(b);
  const timeCompare = aTime.localeCompare(bTime);
  if (timeCompare !== 0) return timeCompare;

  return a.id.localeCompare(b.id);
}

function getCreatedTime(item: WorkItem): string {
  return item.createdAt || "";
}

function buildWorkInputFromTemplate(template: WorkTemplate, fallbackCategoryId: string): Partial<WorkItemInput> {
  const dueDate = resolveTemplateDate(template.dueDateRule) || todayInputValue();
  return {
    title: template.defaultTitle,
    categoryId: template.defaultCategoryId || fallbackCategoryId,
    status: template.defaultStatus,
    content: template.defaultContent,
    date: dueDate,
    plannedDate: resolveTemplateDate(template.plannedDateRule),
    projectId: template.defaultProjectId,
    linkedProjectIds: template.defaultProjectId ? [template.defaultProjectId] : [],
    sourceTemplateId: template.id,
    sourceTemplateType: "work",
    sourceTemplateName: template.name,
    images: [],
  };
}

function resolveTemplateDate(rule: WorkTemplateDateRule): string {
  if (!rule) return "";
  const today = new Date(`${todayInputValue()}T00:00:00`);
  if (rule === "today") return formatInputDate(today);
  if (rule === "tomorrow") {
    today.setDate(today.getDate() + 1);
    return formatInputDate(today);
  }
  if (rule === "next_week") {
    today.setDate(today.getDate() + 7);
    return formatInputDate(today);
  }
  if (rule === "next_workday") {
    do {
      today.setDate(today.getDate() + 1);
    } while (today.getDay() === 0 || today.getDay() === 6);
    return formatInputDate(today);
  }
  return "";
}

function formatInputDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
