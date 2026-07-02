import { useState } from "react";
import { Edit3, Plus, Save, Trash2, X } from "lucide-react";
import type { Category, CategoryInput, WorkItem } from "../../types/dashboard";
import { EmptyState } from "../Common/EmptyState";

interface CategoryManagerProps {
  categories: Category[];
  workItems: WorkItem[];
  compact?: boolean;
  onCreate: (input: CategoryInput) => void;
  onUpdate: (id: string, input: CategoryInput) => void;
  onDelete: (id: string) => void;
}

export function CategoryManager({ categories, workItems, compact = false, onCreate, onUpdate, onDelete }: CategoryManagerProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [sortOrder, setSortOrder] = useState(100);
  const [editingId, setEditingId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, CategoryInput>>({});
  const [error, setError] = useState("");
  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  function createCategory() {
    setError("");
    if (!name.trim()) {
      setError("分类名称是必填项。");
      return;
    }
    onCreate({ name: name.trim(), color, sortOrder });
    setName("");
    setSortOrder((current) => current + 10);
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setDrafts((current) => ({
      ...current,
      [category.id]: { name: category.name, color: category.color, sortOrder: category.sortOrder },
    }));
  }

  function updateDraft(categoryId: string, patch: Partial<CategoryInput>) {
    setDrafts((current) => ({
      ...current,
      [categoryId]: { ...current[categoryId], ...patch },
    }));
  }

  function saveEdit(categoryId: string) {
    const draft = drafts[categoryId];
    if (!draft?.name.trim()) {
      setError("分类名称是必填项。");
      return;
    }
    onUpdate(categoryId, { ...draft, name: draft.name.trim(), sortOrder: Number(draft.sortOrder) || 0 });
    setEditingId("");
  }

  function deleteCategory(category: Category) {
    const usedCount = workItems.filter((item) => item.categoryId === category.id).length;
    if (usedCount > 0) {
      window.alert(`已有 ${usedCount} 条工作内容正在使用该分类，不能直接删除。`);
      return;
    }
    if (window.confirm("确认删除这个分类？")) onDelete(category.id);
  }

  return (
    <section className={compact ? "category-manager-compact" : "page-section"}>
      {!compact && (
        <div className="page-head">
          <div>
            <h2>分类管理</h2>
          </div>
        </div>
      )}
      <section className="panel">
        <div className="section-head">
          <h3>新增分类</h3>
        </div>
        <div className="category-create-grid">
          <label>
            分类名称
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="分类名称" aria-label="分类名称" />
          </label>
          <label>
            颜色
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="分类颜色" />
          </label>
          <label>
            排序
            <input type="number" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} aria-label="排序值" />
          </label>
          <button className="primary-button" type="button" onClick={createCategory}>
            <Plus size={16} />
            新增
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </section>

      {sorted.length === 0 ? (
        <EmptyState title="暂无分类" description="创建分类后，工作内容就可以按分类筛选。" />
      ) : (
        <section className="panel category-table-panel">
          <div className="section-head category-table-title">
            <h3>已有分类 {sorted.length} 个</h3>
          </div>
          <div className="category-table" role="table" aria-label="已有分类">
            <div className="category-table-row category-table-header" role="row">
              <span role="columnheader">分类名称</span>
              <span role="columnheader">排序</span>
              <span role="columnheader">关联工作</span>
              <span role="columnheader">操作</span>
            </div>
            {sorted.map((category) => {
              const usedCount = workItems.filter((item) => item.categoryId === category.id).length;
              const draft = drafts[category.id] || { name: category.name, color: category.color, sortOrder: category.sortOrder };
              const editing = editingId === category.id;

              return (
                <div className={`category-table-row ${editing ? "editing" : ""}`} role="row" key={category.id}>
                  {editing ? (
                    <>
                      <div className="category-edit-name">
                        <input value={draft.name} onChange={(event) => updateDraft(category.id, { name: event.target.value })} aria-label="编辑分类名称" />
                        <input type="color" value={draft.color} onChange={(event) => updateDraft(category.id, { color: event.target.value })} aria-label="编辑分类颜色" />
                      </div>
                      <input type="number" value={draft.sortOrder} onChange={(event) => updateDraft(category.id, { sortOrder: Number(event.target.value) })} aria-label="编辑排序" />
                      <span>{usedCount} 条</span>
                      <div className="category-text-actions">
                        <button className="secondary-button" type="button" onClick={() => saveEdit(category.id)}>
                          <Save size={16} />
                          保存
                        </button>
                        <button className="secondary-button" type="button" onClick={() => setEditingId("")}>
                          <X size={16} />
                          取消
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="category-name-cell">
                        <span className="color-dot" style={{ background: category.color }} />
                        <strong>{category.name}</strong>
                      </span>
                      <span>{category.sortOrder}</span>
                      <span>{usedCount} 条</span>
                      <div className="category-text-actions">
                        <button className="secondary-button" type="button" onClick={() => startEdit(category)}>
                          <Edit3 size={16} />
                          编辑
                        </button>
                        <button
                          className="secondary-button danger-text-action"
                          type="button"
                          disabled={usedCount > 0}
                          title={usedCount > 0 ? "已有工作内容使用，不能删除" : "删除"}
                          onClick={() => deleteCategory(category)}
                        >
                          <Trash2 size={16} />
                          删除
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}
