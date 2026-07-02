import { useState } from "react";
import type { Category, WorkItem, WorkItemInput } from "../../types/dashboard";
import { formatDate, formatDateTime, todayInputValue } from "../../utils/date";
import { EmptyState } from "../Common/EmptyState";
import { Modal } from "../Common/Modal";
import { WorkStatusSelect } from "../WorkItems/WorkStatusSelect";

interface WorkPreviewProps {
  categories: Category[];
  items: WorkItem[];
  onOpenWork: (workId: string) => void;
  onUpdateWork: (id: string, input: WorkItemInput) => void;
}

export function WorkPreview({ categories, items, onOpenWork, onUpdateWork }: WorkPreviewProps) {
  const [showTodayAll, setShowTodayAll] = useState(false);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const today = todayInputValue();
  const todayAllItems = items.filter((item) => item.date === today).sort(compareTodayWorkItems);
  const visibleTodayItems = todayAllItems.filter((item) => item.status !== "已完成");

  return (
    <>
      <section className="panel dashboard-equal-panel today-work-panel">
        <div className="section-head">
          <div>
            <h2>今日工作</h2>
          </div>
          <button className="text-button" type="button" onClick={() => setShowTodayAll(true)}>
            查看全部
          </button>
        </div>
        {visibleTodayItems.length === 0 ? (
          <div className="today-work-empty">
            <EmptyState title="今天没有未完成工作" description="" />
          </div>
        ) : (
          <div className="today-work-list">
            {visibleTodayItems.map((item, index) => {
              const category = categoryMap.get(item.categoryId);
              return (
                <article
                  className="today-work-row"
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenWork(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpenWork(item.id);
                    }
                  }}
                >
                  <span className="today-work-index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="today-work-main">
                    <strong>{item.title}</strong>
                    <div className="today-work-meta">
                      {category && (
                        <span>
                          <span className="mini-dot" style={{ background: category.color }} />
                          {category.name}
                        </span>
                      )}
                      <span>{formatDate(item.date)}</span>
                      <span>更新 {formatDateTime(item.updatedAt || item.createdAt)}</span>
                    </div>
                  </div>
                  <WorkStatusSelect item={item} onUpdate={onUpdateWork} />
                </article>
              );
            })}
          </div>
        )}
      </section>
      {showTodayAll && (
        <Modal title="今日全部工作" onClose={() => setShowTodayAll(false)}>
          {todayAllItems.length === 0 ? (
            <EmptyState title="今天还没有工作记录" description="" />
          ) : (
            <div className="today-work-modal-list">
              {todayAllItems.map((item, index) => (
                <div className="today-work-modal-row" key={item.id}>
                  <span className="today-work-index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <strong>{item.title}</strong>
                  <WorkStatusSelect item={item} onUpdate={onUpdateWork} />
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

function compareTodayWorkItems(a: WorkItem, b: WorkItem): number {
  const timeCompare = (a.createdAt || "").localeCompare(b.createdAt || "");
  if (timeCompare !== 0) return timeCompare;
  return a.id.localeCompare(b.id);
}
