import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { Category, DiaryEntry, DiaryEntryInput, Idea, IdeaInput, Project, ProjectInput, WorkItem, WorkItemInput } from "../../types/dashboard";
import { PROJECT_QUADRANTS, type ProjectQuadrant, type ProjectStatus } from "../../types/dashboard";
import { EmptyState } from "../Common/EmptyState";
import { Modal } from "../Common/Modal";
import { DiaryDetailModal } from "../Diary/DiaryDetailModal";
import { IdeaDetailModal } from "../Ideas/IdeaDetailModal";
import { WorkItemDetailModal } from "../WorkItems/WorkItemDetailModal";
import { ProjectCard } from "./ProjectCard";
import { ProjectDetailModal, type LinkedRecordRef } from "./ProjectDetailModal";
import { getProjectQuadrantLabel, ProjectForm } from "./ProjectForm";

interface ProjectListProps {
  projects: Project[];
  workItems: WorkItem[];
  diaryEntries: DiaryEntry[];
  ideas: Idea[];
  categories: Category[];
  onCreate: (input: ProjectInput) => void;
  onUpdate: (id: string, input: ProjectInput) => void;
  onDelete: (id: string) => void;
  onReorderProjects: (projectIds: string[]) => void;
  onUpdateWork: (id: string, input: WorkItemInput) => void;
  onDeleteWork: (id: string) => void;
  onUpdateDiary: (id: string, input: DiaryEntryInput) => void;
  onDeleteDiary: (id: string) => void;
  onUpdateIdea: (id: string, input: IdeaInput) => void;
  onDeleteIdea: (id: string) => void;
  onConvertIdeaToWork: (id: string, input: WorkItemInput) => void;
  onConvertIdeaToDiary: (id: string, input: DiaryEntryInput) => void;
}

export function ProjectList({
  projects,
  workItems,
  diaryEntries,
  ideas,
  categories,
  onCreate,
  onUpdate,
  onDelete,
  onReorderProjects,
  onUpdateWork,
  onDeleteWork,
  onUpdateDiary,
  onDeleteDiary,
  onUpdateIdea,
  onDeleteIdea,
  onConvertIdeaToWork,
  onConvertIdeaToDiary,
}: ProjectListProps) {
  const [creating, setCreating] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [editingProject, setEditingProject] = useState(false);
  const [linkedRecord, setLinkedRecord] = useState<LinkedRecordRef | null>(null);
  const [editingLinkedRecord, setEditingLinkedRecord] = useState(false);
  const selectedProject = projects.find((project) => project.id === selectedProjectId) || null;
  const linkedWork = linkedRecord?.kind === "work" ? workItems.find((item) => item.id === linkedRecord.id) : null;
  const linkedDiary = linkedRecord?.kind === "diary" ? diaryEntries.find((entry) => entry.id === linkedRecord.id) : null;
  const linkedIdea = linkedRecord?.kind === "idea" ? ideas.find((idea) => idea.id === linkedRecord.id) : null;

  useEffect(() => {
    if (selectedProjectId && !selectedProject) setSelectedProjectId("");
  }, [selectedProjectId, selectedProject]);

  function openLinkedRecord(record: LinkedRecordRef) {
    setSelectedProjectId("");
    setEditingProject(false);
    setLinkedRecord(record);
  }

  function closeLinkedRecord() {
    setLinkedRecord(null);
    setEditingLinkedRecord(false);
  }

  return (
    <section className="page-section">
      <div className="page-head">
        <div>
          <h2>项目管理</h2>
        </div>
        <button className="primary-button" type="button" onClick={() => setCreating(true)}>
          <Plus size={16} />
          新增项目
        </button>
      </div>
      <div className="project-quadrant-shell" aria-label="项目四象限">
        <div className="quadrant-axis-label axis-important">重要</div>
        <div className="quadrant-axis-label axis-not-important">不重要</div>
        <div className="quadrant-axis-label axis-urgent">紧急</div>
        <div className="quadrant-axis-label axis-not-urgent">不紧急</div>
        <div className="project-quadrant-grid">
          {PROJECT_QUADRANTS.map((quadrant) => (
            <QuadrantPanel
              key={quadrant}
              quadrant={quadrant}
              projects={projects.filter((project) => (project.quadrant || "important_not_urgent") === quadrant)}
              onOpenProject={setSelectedProjectId}
              onReorderProjects={onReorderProjects}
              onUpdateProjectStatus={(project, status) => onUpdate(project.id, toProjectInput(project, status))}
            />
          ))}
        </div>
      </div>

      {creating && (
        <Modal title="新增项目" onClose={() => setCreating(false)}>
          <ProjectForm
            onCancel={() => setCreating(false)}
            onSubmit={(input) => {
              onCreate(input);
              setCreating(false);
            }}
          />
        </Modal>
      )}

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          workItems={workItems}
          diaryEntries={diaryEntries}
          ideas={ideas}
          editing={editingProject}
          onEdit={() => setEditingProject(true)}
          onCancelEdit={() => setEditingProject(false)}
          onClose={() => {
            setSelectedProjectId("");
            setEditingProject(false);
          }}
          onUpdate={(input) => {
            onUpdate(selectedProject.id, input);
            setEditingProject(false);
          }}
          onDelete={() => {
            onDelete(selectedProject.id);
            setSelectedProjectId("");
            setEditingProject(false);
          }}
          onOpenLinkedRecord={openLinkedRecord}
        />
      )}

      {linkedWork && (
        <WorkItemDetailModal
          item={linkedWork}
          categories={categories}
          projects={projects}
          editing={editingLinkedRecord}
          onEdit={() => setEditingLinkedRecord(true)}
          onCancelEdit={() => setEditingLinkedRecord(false)}
          onClose={closeLinkedRecord}
          onUpdate={(input) => {
            onUpdateWork(linkedWork.id, input);
            setEditingLinkedRecord(false);
          }}
          onDelete={() => {
            onDeleteWork(linkedWork.id);
            closeLinkedRecord();
          }}
        />
      )}
      {linkedDiary && (
        <DiaryDetailModal
          entry={linkedDiary}
          projects={projects}
          editing={editingLinkedRecord}
          onEdit={() => setEditingLinkedRecord(true)}
          onCancelEdit={() => setEditingLinkedRecord(false)}
          onClose={closeLinkedRecord}
          onUpdate={(input) => {
            onUpdateDiary(linkedDiary.id, input);
            setEditingLinkedRecord(false);
          }}
          onDelete={() => {
            onDeleteDiary(linkedDiary.id);
            closeLinkedRecord();
          }}
        />
      )}
      {linkedIdea && (
        <IdeaDetailModal
          idea={linkedIdea}
          projects={projects}
          categories={categories}
          editing={editingLinkedRecord}
          onEdit={() => setEditingLinkedRecord(true)}
          onCancelEdit={() => setEditingLinkedRecord(false)}
          onClose={closeLinkedRecord}
          onUpdate={(input) => {
            onUpdateIdea(linkedIdea.id, input);
            setEditingLinkedRecord(false);
          }}
          onDelete={() => {
            onDeleteIdea(linkedIdea.id);
            closeLinkedRecord();
          }}
          onConvertToWork={(input) => onConvertIdeaToWork(linkedIdea.id, input)}
          onConvertToDiary={(input) => onConvertIdeaToDiary(linkedIdea.id, input)}
        />
      )}
    </section>
  );
}

interface QuadrantPanelProps {
  quadrant: ProjectQuadrant;
  projects: Project[];
  onOpenProject: (projectId: string) => void;
  onReorderProjects: (projectIds: string[]) => void;
  onUpdateProjectStatus: (project: Project, status: ProjectStatus) => void;
}

function QuadrantPanel({ quadrant, projects, onOpenProject, onReorderProjects, onUpdateProjectStatus }: QuadrantPanelProps) {
  const orderedProjects = [...projects].sort(compareProjectOrder);

  function moveProject(projectId: string, direction: "up" | "down") {
    const currentIndex = orderedProjects.findIndex((project) => project.id === projectId);
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedProjects.length) return;

    const nextProjects = [...orderedProjects];
    [nextProjects[currentIndex], nextProjects[nextIndex]] = [nextProjects[nextIndex], nextProjects[currentIndex]];
    onReorderProjects(nextProjects.map((project) => project.id));
  }

  return (
    <section className={`quadrant-panel quadrant-${quadrant}`}>
      <div className="quadrant-head">
        <h3>{getProjectQuadrantLabel(quadrant)}</h3>
        <span>{orderedProjects.length} 个</span>
      </div>
      {orderedProjects.length === 0 ? (
        <EmptyState title="暂无项目" />
      ) : (
        <div className="quadrant-project-list">
          {orderedProjects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              sortIndex={index}
              totalCount={orderedProjects.length}
              onOpen={() => onOpenProject(project.id)}
              onStatusChange={(status) => onUpdateProjectStatus(project, status)}
              onMoveUp={() => moveProject(project.id, "up")}
              onMoveDown={() => moveProject(project.id, "down")}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function compareProjectOrder(a: Project, b: Project) {
  const aHasOrder = Number.isFinite(Number(a.sortOrder));
  const bHasOrder = Number.isFinite(Number(b.sortOrder));
  if (aHasOrder && bHasOrder) {
    const orderDelta = Number(a.sortOrder) - Number(b.sortOrder);
    if (orderDelta !== 0) return orderDelta;
  }
  if (aHasOrder !== bHasOrder) return aHasOrder ? -1 : 1;
  const createdDelta = getTimeValue(a.createdAt) - getTimeValue(b.createdAt);
  if (createdDelta !== 0) return createdDelta;
  return a.id.localeCompare(b.id);
}

function getTimeValue(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function toProjectInput(project: Project, status: ProjectStatus): ProjectInput {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = project;
  return { ...input, status };
}
