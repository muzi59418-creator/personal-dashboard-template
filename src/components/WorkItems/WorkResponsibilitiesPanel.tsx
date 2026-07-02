import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Edit3, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { WorkResponsibilityGroup } from "../../types/dashboard";
import { createId } from "../../utils/id";
import { EmptyState } from "../Common/EmptyState";
import { Modal } from "../Common/Modal";

interface WorkResponsibilitiesPanelProps {
  responsibilities: WorkResponsibilityGroup[];
  onSave: (groups: WorkResponsibilityGroup[]) => void;
}

type ResponsibilityDialog =
  | { mode: "create" }
  | { mode: "edit"; groupId: string };

export function WorkResponsibilitiesPanel({ responsibilities, onSave }: WorkResponsibilitiesPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedItemGroupIds, setExpandedItemGroupIds] = useState<string[]>([]);
  const [dialog, setDialog] = useState<ResponsibilityDialog | null>(null);
  const [formName, setFormName] = useState("");
  const [formItems, setFormItems] = useState("");
  const [formError, setFormError] = useState("");
  const sortedResponsibilities = sortGroups(responsibilities);
  const itemCount = sortedResponsibilities.reduce((total, group) => total + group.items.length, 0);
  const summary =
    sortedResponsibilities.length > 0
      ? `${sortedResponsibilities.map((group) => group.name).slice(0, 3).join(" / ")} · 已配置 ${sortedResponsibilities.length} 个职责分类 / ${itemCount} 项职责`
      : "暂未配置职责";

  function openCreateDialog() {
    setDialog({ mode: "create" });
    setFormName("");
    setFormItems("");
    setFormError("");
  }

  function openEditDialog(group: WorkResponsibilityGroup) {
    setDialog({ mode: "edit", groupId: group.id });
    setFormName(group.name);
    setFormItems(group.items.join("\n"));
    setFormError("");
  }

  function closeDialog() {
    setDialog(null);
    setFormName("");
    setFormItems("");
    setFormError("");
  }

  function saveDialog() {
    const name = formName.trim();
    const items = parseResponsibilityItems(formItems);
    const editingGroupId = dialog?.mode === "edit" ? dialog.groupId : "";

    if (!name) {
      setFormError("职责分类不能为空。");
      return;
    }

    if (items.length === 0) {
      setFormError("职责条目不能为空，请至少填写一条有效职责。");
      return;
    }

    const hasDuplicateName = sortedResponsibilities.some((group) => group.id !== editingGroupId && group.name.trim() === name);
    if (hasDuplicateName) {
      setFormError("已存在同名职责分类，请修改分类名称。");
      return;
    }

    if (dialog?.mode === "edit") {
      onSave(
        sortedResponsibilities.map((group) =>
          group.id === dialog.groupId
            ? {
                ...group,
                name,
                items,
              }
            : group,
        ),
      );
    } else {
      const lastSortOrder = sortedResponsibilities.length > 0 ? sortedResponsibilities[sortedResponsibilities.length - 1].sortOrder : 0;
      onSave([
        ...sortedResponsibilities,
        {
          id: createId("resp_group"),
          name,
          items,
          sortOrder: lastSortOrder + 10,
        },
      ]);
      setExpanded(true);
    }

    closeDialog();
  }

  function deleteGroup(group: WorkResponsibilityGroup) {
    const confirmed = window.confirm(`确定删除“${group.name}”吗？该分类下的全部职责条目也会一并删除。`);
    if (!confirmed) return;

    onSave(
      sortedResponsibilities
        .filter((item) => item.id !== group.id)
        .map((item, index) => ({
          ...item,
          sortOrder: (index + 1) * 10,
        })),
    );
    setExpandedItemGroupIds((current) => current.filter((groupId) => groupId !== group.id));
  }

  function moveGroup(groupId: string, direction: -1 | 1) {
    const index = sortedResponsibilities.findIndex((group) => group.id === groupId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= sortedResponsibilities.length) return;

    const next = [...sortedResponsibilities];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    onSave(
      next.map((group, nextIndex) => ({
        ...group,
        sortOrder: (nextIndex + 1) * 10,
      })),
    );
  }

  function toggleGroupItems(groupId: string) {
    setExpandedItemGroupIds((current) => (current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId]));
  }

  return (
    <section className="work-responsibilities-panel">
      <div className="work-responsibilities-head">
        <div>
          <h3>长期职责</h3>
          <p>{summary}</p>
        </div>
        <div className="icon-actions">
          <button className="primary-button" type="button" onClick={openCreateDialog}>
            <Plus size={16} />
            新增职责
          </button>
          <button className="secondary-button" type="button" onClick={() => setExpanded((current) => !current)}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded ? "收起" : "展开"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="responsibility-content">
          {sortedResponsibilities.length === 0 ? (
            <EmptyState title="暂无长期职责" description="点击“+ 新增职责”，记录长期负责的事项范围。" />
          ) : (
            sortedResponsibilities.map((group, index) => {
              const showAllItems = expandedItemGroupIds.includes(group.id);
              const visibleItems = showAllItems ? group.items : group.items.slice(0, 5);
              const canMoveUp = index > 0;
              const canMoveDown = index < sortedResponsibilities.length - 1;

              return (
                <article className="responsibility-group-card" key={group.id}>
                  <div className="responsibility-card-head">
                    <div className="responsibility-card-title">
                      <h4>{group.name}</h4>
                      <span className="responsibility-count-badge">{group.items.length} 条职责</span>
                    </div>
                    <div className="responsibility-card-actions">
                      <div className="responsibility-sort-actions" aria-label={`调整 ${group.name} 顺序`}>
                        <button
                          className="icon-button"
                          type="button"
                          aria-label={`上移 ${group.name}`}
                          title="上移"
                          disabled={!canMoveUp}
                          onClick={() => moveGroup(group.id, -1)}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          className="icon-button"
                          type="button"
                          aria-label={`下移 ${group.name}`}
                          title="下移"
                          disabled={!canMoveDown}
                          onClick={() => moveGroup(group.id, 1)}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                      <button className="text-button" type="button" onClick={() => openEditDialog(group)}>
                        <Edit3 size={15} />
                        编辑
                      </button>
                      <button className="text-button danger-text-button" type="button" onClick={() => deleteGroup(group)}>
                        <Trash2 size={15} />
                        删除
                      </button>
                    </div>
                  </div>

                  {group.items.length === 0 ? (
                    <p className="muted-text">暂无职责条目。</p>
                  ) : (
                    <>
                      <ul>
                        {visibleItems.map((item, index) => (
                          <li key={`${group.id}-item-${index}`}>{item}</li>
                        ))}
                      </ul>
                      {group.items.length > 5 && (
                        <button className="text-button responsibility-toggle-items" type="button" onClick={() => toggleGroupItems(group.id)}>
                          {showAllItems ? "收起" : `展开全部（共 ${group.items.length} 条）`}
                        </button>
                      )}
                    </>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}

      {dialog && (
        <Modal title={dialog.mode === "edit" ? "编辑长期职责" : "新增长期职责"} onClose={closeDialog}>
          <div className="responsibility-form">
            <label>
              职责分类
              <input value={formName} onChange={(event) => setFormName(event.target.value)} placeholder="请输入职责分类名称" autoFocus />
            </label>
            <label>
              职责条目
              <textarea value={formItems} onChange={(event) => setFormItems(event.target.value)} placeholder="每行填写一条职责" rows={8} />
            </label>
            {formError && <p className="form-error">{formError}</p>}
            <div className="form-actions">
              <button className="secondary-button" type="button" onClick={closeDialog}>
                取消
              </button>
              <button className="primary-button" type="button" onClick={saveDialog}>
                保存
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

function sortGroups(groups: WorkResponsibilityGroup[]) {
  return [...groups].sort((a, b) => a.sortOrder - b.sortOrder);
}

function parseResponsibilityItems(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[•\-*]\s*|\d+[.、．)]\s*)/, "").trim())
    .filter(Boolean);
}
