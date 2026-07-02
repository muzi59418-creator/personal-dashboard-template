import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useState } from "react";
import type { Category } from "../../types/dashboard";
import { EmptyState } from "../Common/EmptyState";

interface CategoryPanelProps {
  categories: Category[];
  onReorder: (categoryIds: string[]) => void;
}

export function CategoryPanel({ categories, onReorder }: CategoryPanelProps) {
  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const [draggingId, setDraggingId] = useState("");
  const [overId, setOverId] = useState("");

  function reorder(fromId: string, toId: string) {
    if (!fromId || !toId || fromId === toId) return;
    const next = [...sorted];
    const fromIndex = next.findIndex((category) => category.id === fromId);
    const toIndex = next.findIndex((category) => category.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onReorder(next.map((category) => category.id));
  }

  function move(categoryId: string, direction: -1 | 1) {
    const index = sorted.findIndex((category) => category.id === categoryId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) return;
    const next = [...sorted];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    onReorder(next.map((category) => category.id));
  }

  return (
    <section className="panel dashboard-equal-panel">
      <div className="section-head">
        <div>
          <h2>工作内容分类</h2>
        </div>
      </div>
      {sorted.length === 0 ? (
        <EmptyState title="暂无分类" description="可以在工作内容页后续的分类管理入口中创建工作分类。" />
      ) : (
        <div className="category-sort-list">
          {sorted.map((category, index) => (
            <div
              className={`category-sort-row ${draggingId === category.id ? "dragging" : ""} ${overId === category.id ? "drag-over" : ""}`}
              draggable
              key={category.id}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", category.id);
                setDraggingId(category.id);
              }}
              onDragEnter={() => setOverId(category.id)}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDragLeave={() => setOverId((current) => (current === category.id ? "" : current))}
              onDrop={(event) => {
                event.preventDefault();
                reorder(event.dataTransfer.getData("text/plain"), category.id);
                setDraggingId("");
                setOverId("");
              }}
              onDragEnd={() => {
                setDraggingId("");
                setOverId("");
              }}
            >
              <GripVertical className="drag-handle" size={17} aria-hidden="true" />
              <span className="sort-index">{index + 1}</span>
              <span className="color-dot" style={{ background: category.color }} />
              <strong>{category.name}</strong>
              <div className="sort-mobile-actions">
                <button className="icon-button" type="button" aria-label="上移分类" title="上移" onClick={() => move(category.id, -1)}>
                  <ArrowUp size={15} />
                </button>
                <button className="icon-button" type="button" aria-label="下移分类" title="下移" onClick={() => move(category.id, 1)}>
                  <ArrowDown size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
