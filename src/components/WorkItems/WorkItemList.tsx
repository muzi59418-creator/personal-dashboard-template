import { useEffect, useMemo, useState } from "react";
import { Plus, Tags } from "lucide-react";
import type {
  Category,
  CategoryInput,
  Project,
  RoutineWorkTemplate,
  RoutineWorkTemplateInput,
  WorkItem,
  WorkItemInput,
  WorkResponsibilityGroup,
} from "../../types/dashboard";
import { WORK_STATUSES } from "../../types/dashboard";
import { formatDate, formatDateTime, formatWeekday } from "../../utils/date";
import { CategoryManager } from "../Categories/CategoryManager";
import { DateInput } from "../Common/DateInput";
import { EmptyState } from "../Common/EmptyState";
import { Modal } from "../Common/Modal";
import { WorkItemDetailModal } from "./WorkItemDetailModal";
import { WorkItemForm } from "./WorkItemForm";
import { RoutineWorkPanel } from "./RoutineWorkPanel";
import { WorkResponsibilitiesPanel } from "./WorkResponsibilitiesPanel";
import { WorkStatusSelect } from "./WorkStatusSelect";

interface WorkItemListProps {
  items: WorkItem[];
  categories: Category[];
  projects: Project[];
  responsibilities: WorkResponsibilityGroup[];
  routineWorkTemplates: RoutineWorkTemplate[];
  onCreate: (input: WorkItemInput) => void;
  onUpdate: (id: string, input: WorkItemInput) => void;
  onDelete: (id: string) => void;
  onUpdateResponsibilities: (groups: WorkResponsibilityGroup[]) => void;
  onCreateRoutineWork: (input: RoutineWorkTemplateInput) => void;
  onUpdateRoutineWork: (id: string, input: RoutineWorkTemplateInput) => void;
  onDeleteRoutineWork: (id: string) => void;
  onGenerateRoutineWork: () => void;
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
  onCreate,
  onUpdate,
  onDelete,
  onUpdateResponsibilities,
  onCreateRoutineWork,
  onUpdateRoutineWork,
  onDeleteRoutineWork,
  onGenerateRoutineWork,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: WorkItemListProps) {
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [creating, setCreating] = useState(false);
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
        return true;
      })
      .sort(compareWorkItems);

    const groups = new Map<string, WorkItem[]>();
    visibleItems.forEach((item) => {
      const dateKey = item.date || "";
      groups.set(dateKey, [...(groups.get(dateKey) || []), item]);
    });

    return Array.from(groups, ([date, groupItems]) => ({ date, items: groupItems }));
  }, [categoryFilter, dateFilter, items, projectFilter, statusFilter]);

  function clearFilters() {
    setCategoryFilter("");
    setStatusFilter("");
    setProjectFilter("");
    setDateFilter("");
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
        <DateInput className="filter-control" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="日期筛选" />
        <button className="secondary-button" type="button" onClick={clearFilters}>
          查看全部
        </button>
        <button className="secondary-button" type="button" onClick={() => setCategoryManagerOpen(true)}>
          <Tags size={16} />
          分类管理
        </button>
        <button className="primary-button" type="button" onClick={() => setCreating(true)}>
          <Plus size={16} />
          新增工作
        </button>
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
        <Modal title="新增工作内容" onClose={() => setCreating(false)}>
          <WorkItemForm
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
