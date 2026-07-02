import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Category, DiaryEntryInput, Idea, IdeaInput, Project, WorkItemInput } from "../../types/dashboard";
import { formatDate, formatDateTime, formatWeekday } from "../../utils/date";
import { EmptyState } from "../Common/EmptyState";
import { Modal } from "../Common/Modal";
import { IdeaDetailModal } from "./IdeaDetailModal";
import { IdeaForm, getIdeaStatusLabel } from "./IdeaForm";

interface IdeaListProps {
  ideas: Idea[];
  projects: Project[];
  categories: Category[];
  onCreate: (input: IdeaInput) => void;
  onUpdate: (id: string, input: IdeaInput) => void;
  onDelete: (id: string) => void;
  onConvertToWork: (id: string, input: WorkItemInput) => void;
  onConvertToDiary: (id: string, input: DiaryEntryInput) => void;
}

export function IdeaList({ ideas, projects, categories, onCreate, onUpdate, onDelete, onConvertToWork, onConvertToDiary }: IdeaListProps) {
  const [creating, setCreating] = useState(false);
  const [selectedIdeaId, setSelectedIdeaId] = useState("");
  const [editingDetail, setEditingDetail] = useState(false);
  const projectMap = new Map(projects.map((project) => [project.id, project.name]));
  const selectedIdea = ideas.find((idea) => idea.id === selectedIdeaId) || null;

  const groupedIdeas = useMemo(() => {
    const sortedIdeas = [...ideas].sort(compareIdeas);
    const groups = new Map<string, Idea[]>();

    sortedIdeas.forEach((idea) => {
      const date = getIdeaDate(idea);
      groups.set(date, [...(groups.get(date) || []), idea]);
    });

    return Array.from(groups, ([date, groupIdeas]) => ({ date, ideas: groupIdeas }));
  }, [ideas]);

  useEffect(() => {
    if (selectedIdeaId && !selectedIdea) setSelectedIdeaId("");
  }, [selectedIdeaId, selectedIdea]);

  return (
    <section className="page-section">
      <div className="page-head">
        <div>
          <h2>灵感</h2>
        </div>
      </div>
      <div className="page-primary-action">
        <button className="primary-button" type="button" onClick={() => setCreating(true)}>
          <Plus size={16} />
          写想法
        </button>
      </div>

      {groupedIdeas.length === 0 ? (
        <EmptyState title="暂无灵感" description="点击写想法，保存文字、截图和图片附件。" />
      ) : (
        <div className="timeline-list">
          {groupedIdeas.map((group) => (
            <section className="timeline-group" key={group.date || "no-date"}>
              <div className="timeline-marker" aria-hidden="true" />
              <div className="timeline-content">
                <div className="timeline-heading">
                  <h3>{formatDate(group.date)}</h3>
                  {group.date && <span>{formatWeekday(group.date)}</span>}
                  <strong>{group.ideas.length} 条想法</strong>
                </div>
                <div className="timeline-card-list">
                  {group.ideas.map((idea) => (
                    <button className="idea-row timeline-card" type="button" key={idea.id} onClick={() => setSelectedIdeaId(idea.id)}>
                      <div className="idea-row-main">
                        <strong>{idea.title || idea.content.slice(0, 24) || "未命名图文记录"}</strong>
                        <span>{idea.content || "暂无正文内容"}</span>
                      </div>
                      <span className="chip status">{getIdeaStatusLabel(idea.status)}</span>
                      <span className="idea-row-meta">{projectMap.get(idea.projectId || "") || "未关联项目"}</span>
                      <time className="idea-row-meta">更新 {formatDateTime(idea.updatedAt || idea.createdAt)}</time>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {creating && (
        <Modal title="新增图文想法" onClose={() => setCreating(false)}>
          <IdeaForm
            projects={projects}
            onCancel={() => setCreating(false)}
            onSubmit={(input) => {
              onCreate(input);
              setCreating(false);
            }}
          />
        </Modal>
      )}

      {selectedIdea && (
        <IdeaDetailModal
          idea={selectedIdea}
          projects={projects}
          categories={categories}
          editing={editingDetail}
          onEdit={() => setEditingDetail(true)}
          onCancelEdit={() => setEditingDetail(false)}
          onClose={() => {
            setSelectedIdeaId("");
            setEditingDetail(false);
          }}
          onUpdate={(input) => {
            onUpdate(selectedIdea.id, input);
            setEditingDetail(false);
          }}
          onDelete={() => {
            onDelete(selectedIdea.id);
            setSelectedIdeaId("");
            setEditingDetail(false);
          }}
          onConvertToWork={(input) => {
            onConvertToWork(selectedIdea.id, input);
            setEditingDetail(false);
          }}
          onConvertToDiary={(input) => {
            onConvertToDiary(selectedIdea.id, input);
            setEditingDetail(false);
          }}
        />
      )}
    </section>
  );
}

function compareIdeas(a: Idea, b: Idea): number {
  const dateCompare = getIdeaDate(b).localeCompare(getIdeaDate(a));
  if (dateCompare !== 0) return dateCompare;

  const timeCompare = getIdeaTime(b).localeCompare(getIdeaTime(a));
  if (timeCompare !== 0) return timeCompare;

  return b.id.localeCompare(a.id);
}

function getIdeaDate(idea: Idea): string {
  return getIdeaTime(idea).slice(0, 10);
}

function getIdeaTime(idea: Idea): string {
  return idea.updatedAt || idea.createdAt || "";
}
