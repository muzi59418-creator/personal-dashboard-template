import type { DiaryEntry, Project } from "../../types/dashboard";
import { formatDate, formatDateTime, formatWeekday } from "../../utils/date";
import { getRecentDiaryEntries } from "../../utils/diaryPreview";

interface DiaryPreviewProps {
  entries: DiaryEntry[];
  projects: Project[];
  onViewAll: () => void;
}

export function DiaryPreview({ entries, projects, onViewAll }: DiaryPreviewProps) {
  const projectMap = new Map(projects.map((project) => [project.id, project.name]));
  const recentEntries = getRecentDiaryEntries(entries);

  return (
    <section className={`panel dashboard-equal-panel diary-preview-panel${recentEntries.length === 0 ? " diary-preview-panel-empty" : ""}`}>
      <div className="section-head">
        <div>
          <h2>工作日记</h2>
        </div>
        <button className="text-button" type="button" onClick={onViewAll}>
          查看全部
        </button>
      </div>
      {recentEntries.length === 0 ? (
        <p className="diary-preview-empty">最近 3 天暂无工作日记</p>
      ) : (
        <div className="preview-list">
          {recentEntries.map((entry) => (
            <article className="preview-row diary-preview-row" key={entry.id}>
              <div>
                <div className="preview-title-line">
                  <span className="preview-date">{formatDate(entry.date)}</span>
                  <span className="preview-weekday">{formatWeekday(entry.date)}</span>
                </div>
                <strong>{entry.title}</strong>
                <p>{entry.content}</p>
                <div className="chip-row">
                  {entry.tags.map((tag) => (
                    <span className="chip" key={tag}>{tag}</span>
                  ))}
                  {entry.linkedProjectIds.map((projectId) => (
                    <span className="chip outline" key={projectId}>{projectMap.get(projectId) || "关联项目"}</span>
                  ))}
                </div>
              </div>
              <div className="preview-meta">
                <span>更新 {formatDateTime(entry.updatedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
