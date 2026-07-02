import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { DiaryEntry, DiaryEntryInput, Project } from "../../types/dashboard";
import { formatDate, formatDateTime, formatWeekday } from "../../utils/date";
import { DateInput } from "../Common/DateInput";
import { EmptyState } from "../Common/EmptyState";
import { Modal } from "../Common/Modal";
import { DiaryDetailModal } from "./DiaryDetailModal";
import { DiaryForm } from "./DiaryForm";

interface DiaryListProps {
  entries: DiaryEntry[];
  projects: Project[];
  onCreate: (input: DiaryEntryInput) => void;
  onUpdate: (id: string, input: DiaryEntryInput) => void;
  onDelete: (id: string) => void;
}

export function DiaryList({ entries, projects, onCreate, onUpdate, onDelete }: DiaryListProps) {
  const [dateFilter, setDateFilter] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [editingDetail, setEditingDetail] = useState(false);
  const [creating, setCreating] = useState(false);
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) || null;
  const projectMap = new Map(projects.map((project) => [project.id, project.name]));

  useEffect(() => {
    if (selectedEntryId && !selectedEntry) setSelectedEntryId("");
  }, [selectedEntryId, selectedEntry]);

  const groupedEntries = useMemo(() => {
    const visibleEntries = entries
      .filter((entry) => !dateFilter || entry.date === dateFilter)
      .sort(compareDiaryEntries);

    const groups = new Map<string, DiaryEntry[]>();
    visibleEntries.forEach((entry) => {
      groups.set(entry.date || "", [...(groups.get(entry.date || "") || []), entry]);
    });

    return Array.from(groups, ([date, groupEntries]) => ({ date, entries: groupEntries }));
  }, [dateFilter, entries]);

  return (
    <section className="page-section">
      <div className="page-head">
        <div>
          <h2>工作日记</h2>
        </div>
      </div>
      <div className="toolbar">
        <label>
          日期筛选
          <DateInput value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
        </label>
        <button className="secondary-button" type="button" onClick={() => setDateFilter("")}>
          查看全部日记
        </button>
        <button className="primary-button" type="button" onClick={() => setCreating(true)}>
          <Plus size={16} />
          写日记
        </button>
      </div>
      {groupedEntries.length === 0 ? (
        <EmptyState title="没有匹配的日记" description="可以清空筛选，或新增一条工作日记。" />
      ) : (
        <div className="timeline-list">
          {groupedEntries.map((group) => (
            <section className="timeline-group" key={group.date || "no-date"}>
              <div className="timeline-marker" aria-hidden="true" />
              <div className="timeline-content">
                <div className="timeline-heading">
                  <h3>{formatDate(group.date)}</h3>
                  {group.date && <span>{formatWeekday(group.date)}</span>}
                  <strong>{group.entries.length} 篇日记</strong>
                </div>
                <div className="timeline-card-list">
                  {group.entries.map((entry) => (
                    <button className="list-card diary-card-button timeline-card" type="button" key={entry.id} onClick={() => setSelectedEntryId(entry.id)}>
                      <div className="diary-card-layout">
                        <div>
                          <h3>{entry.title}</h3>
                          <p>{entry.content}</p>
                          <div className="chip-row">
                            {entry.tags.slice(0, 3).map((tag) => (
                              <span className="chip" key={tag}>
                                {tag}
                              </span>
                            ))}
                            {entry.linkedProjectIds.slice(0, 2).map((projectId) => (
                              <span className="chip outline" key={projectId}>
                                {projectMap.get(projectId) || "关联项目"}
                              </span>
                            ))}
                            <span className="chip outline">更新 {formatDateTime(entry.updatedAt || entry.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {creating && (
        <Modal title="新增工作日记" onClose={() => setCreating(false)}>
          <DiaryForm
            projects={projects}
            onCancel={() => setCreating(false)}
            onSubmit={(input) => {
              onCreate(input);
              setCreating(false);
            }}
          />
        </Modal>
      )}

      {selectedEntry && (
        <DiaryDetailModal
          entry={selectedEntry}
          projects={projects}
          editing={editingDetail}
          onEdit={() => setEditingDetail(true)}
          onCancelEdit={() => setEditingDetail(false)}
          onClose={() => {
            setSelectedEntryId("");
            setEditingDetail(false);
          }}
          onUpdate={(input) => {
            onUpdate(selectedEntry.id, input);
            setEditingDetail(false);
          }}
          onDelete={() => {
            onDelete(selectedEntry.id);
            setSelectedEntryId("");
            setEditingDetail(false);
          }}
        />
      )}
    </section>
  );
}

function compareDiaryEntries(a: DiaryEntry, b: DiaryEntry): number {
  const dateCompare = b.date.localeCompare(a.date);
  if (dateCompare !== 0) return dateCompare;

  const timeCompare = getEntryTime(b).localeCompare(getEntryTime(a));
  if (timeCompare !== 0) return timeCompare;

  return b.id.localeCompare(a.id);
}

function getEntryTime(entry: DiaryEntry): string {
  return entry.updatedAt || entry.createdAt || "";
}
