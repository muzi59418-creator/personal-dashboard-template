import type { DiaryEntry, Project } from "../../types/dashboard";
import { formatDate, formatDateTime } from "../../utils/date";

interface DiaryCardProps {
  entry: DiaryEntry;
  projects: Project[];
  onOpen: () => void;
}

export function DiaryCard({ entry, projects, onOpen }: DiaryCardProps) {
  const projectMap = new Map(projects.map((project) => [project.id, project.name]));

  return (
    <button className="list-card diary-card-button" type="button" onClick={onOpen}>
      <div className="diary-card-layout">
        <div className="diary-date-block">
          <strong>{formatDate(entry.date)}</strong>
        </div>
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
            <span className="chip outline">更新 {formatDateTime(entry.updatedAt)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
