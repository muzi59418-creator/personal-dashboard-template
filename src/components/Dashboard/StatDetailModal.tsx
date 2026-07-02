import { useEffect } from "react";
import { X } from "lucide-react";
import type { WorkItem, WorkItemInput } from "../../types/dashboard";
import type { StatRecord, StatRecordSection } from "../../utils/stats";
import { WorkStatusSelect } from "../WorkItems/WorkStatusSelect";

interface StatDetailModalProps {
  title: string;
  sections: StatRecordSection[];
  workItems: WorkItem[];
  onUpdateWork: (id: string, input: WorkItemInput) => void;
  onClose: () => void;
  onOpenRecord: (record: StatRecord) => void;
}

export function StatDetailModal({ title, sections, workItems, onUpdateWork, onClose, onOpenRecord }: StatDetailModalProps) {
  const visibleSections = sections.filter((section) => section.records.length > 0);
  const workItemMap = new Map(workItems.map((item) => [item.id, item]));

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="stat-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="stat-modal" role="dialog" aria-modal="true" aria-label={`${title}详情`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="stat-modal-header">
          <div>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="关闭" title="关闭" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="stat-modal-body">
          {visibleSections.length === 0 ? (
            <div className="empty-state stat-empty">
              <strong>暂无匹配记录</strong>
              <span>当前口径下没有可展示的数据。</span>
            </div>
          ) : (
            visibleSections.map((section) => (
              <section className="stat-detail-section" key={section.title}>
                <h3>{section.title}</h3>
                <div className="stat-detail-list">
                  {section.records.map((record) => {
                    const workItem = record.kind === "work" ? workItemMap.get(record.id) : null;
                    return (
                      <article
                        className="stat-detail-row"
                        key={`${record.kind}-${record.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpenRecord(record)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onOpenRecord(record);
                          }
                        }}
                      >
                        <span>{record.title}</span>
                        {workItem ? <WorkStatusSelect item={workItem} onUpdate={onUpdateWork} /> : <strong>{record.status}</strong>}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
