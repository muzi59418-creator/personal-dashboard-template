import { useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { useEffect } from "react";
import type {
  CategoryInput,
  DashboardData,
  DiaryEntryInput,
  IdeaInput,
  ProjectInput,
  RoutineWorkTemplateInput,
  WorkTemplateInput,
  WorkResponsibilityGroupInput,
  WorkItemInput,
} from "./types/dashboard";
import {
  clearData,
  convertIdeaToDiaryEntry,
  convertIdeaToWorkItem,
  createCategory,
  createDiaryEntry,
  createIdea,
  createProject,
  createRoutineWorkTemplate,
  createWorkTemplate,
  createWorkItem,
  deleteCategory,
  deleteDiaryEntry,
  deleteIdea,
  deleteProject,
  deleteRoutineWorkTemplate,
  deleteWorkTemplate,
  deleteWorkItem,
  exportData,
  getDashboardData,
  importData,
  pauseRoutineWorkTemplate,
  postponeRoutineWorkItem,
  reorderProjects,
  reorderWorkTemplates,
  resumeRoutineWorkTemplate,
  skipRoutineWorkItem,
  syncRoutineWorkForDate,
  updateCategory,
  updateDiaryEntry,
  updateIdea,
  updateProject,
  updateRoutineWorkTemplate,
  updateRoutineWorkTemplateWithMode,
  updateWorkTemplate,
  updateWorkResponsibilities,
  updateWorkItem,
} from "./data/repository";
import { readSidebarCollapsed, writeSidebarCollapsed } from "./data/uiPreferences";
import { todayInputValue } from "./utils/date";
import { MobileTabBar } from "./components/Layout/MobileTabBar";
import { Sidebar, type ViewKey } from "./components/Layout/Sidebar";
import { CategoryManager } from "./components/Categories/CategoryManager";
import { DiaryPreview } from "./components/Dashboard/DiaryPreview";
import { ProjectOverview } from "./components/Dashboard/ProjectOverview";
import { QuickCapture } from "./components/Dashboard/QuickCapture";
import { StatCards } from "./components/Dashboard/StatCards";
import { WorkCompletionOverview } from "./components/Dashboard/WorkCompletionOverview";
import { WorkPreview } from "./components/Dashboard/WorkPreview";
import { DiaryDetailModal } from "./components/Diary/DiaryDetailModal";
import { DiaryList } from "./components/Diary/DiaryList";
import { IdeaDetailModal } from "./components/Ideas/IdeaDetailModal";
import { IdeaList } from "./components/Ideas/IdeaList";
import { ProjectDetailModal } from "./components/Projects/ProjectDetailModal";
import { ProjectList } from "./components/Projects/ProjectList";
import { BackupPanel } from "./components/Settings/BackupPanel";
import { WorkItemDetailModal } from "./components/WorkItems/WorkItemDetailModal";
import { WorkItemList } from "./components/WorkItems/WorkItemList";
import type { StatRecord } from "./utils/stats";

function App() {
  const [data, setData] = useState<DashboardData>(() => getDashboardData());
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readSidebarCollapsed());
  const [notice, setNotice] = useState("");

  const actions = useMemo(
    () => ({
      createDiary: (input: DiaryEntryInput) => runAction(() => createDiaryEntry(input), "日记已保存"),
      updateDiary: (id: string, input: DiaryEntryInput) => runAction(() => updateDiaryEntry(id, input), "日记已更新"),
      deleteDiary: (id: string) => runAction(() => deleteDiaryEntry(id), "日记已删除"),
      createWork: (input: WorkItemInput) => runAction(() => createWorkItem(input), "工作内容已保存"),
      updateWork: (id: string, input: WorkItemInput) => runAction(() => updateWorkItem(id, input), "工作内容已更新"),
      deleteWork: (id: string) => runAction(() => deleteWorkItem(id), "工作内容已删除"),
      createRoutineWorkAction: (input: RoutineWorkTemplateInput) => runAction(() => createRoutineWorkTemplate(input), "例行工作已保存"),
      updateRoutineWorkAction: (id: string, input: RoutineWorkTemplateInput, mode?: "future" | "sync_open") =>
        runAction(() => (mode ? updateRoutineWorkTemplateWithMode(id, input, mode) : updateRoutineWorkTemplate(id, input)), "例行工作已更新"),
      deleteRoutineWorkAction: (id: string, action?: "keep" | "skip" | "delete") => runAction(() => deleteRoutineWorkTemplate(id, action), "例行工作已删除"),
      pauseRoutineWorkAction: (
        id: string,
        pendingTaskPolicy: RoutineWorkTemplateInput["pendingTaskPolicy"],
        pausedUntil?: string,
        resumeStrategy?: RoutineWorkTemplateInput["resumeStrategy"],
      ) => runAction(() => pauseRoutineWorkTemplate(id, pendingTaskPolicy, pausedUntil, resumeStrategy), "例行工作已暂停"),
      resumeRoutineWorkAction: (id: string, strategy?: RoutineWorkTemplateInput["resumeStrategy"]) =>
        runAction(() => resumeRoutineWorkTemplate(id, strategy), "例行工作已恢复"),
      createWorkTemplateAction: (input: WorkTemplateInput) => runAction(() => createWorkTemplate(input), "工作模板已保存"),
      updateWorkTemplateAction: (id: string, input: WorkTemplateInput) => runAction(() => updateWorkTemplate(id, input), "工作模板已更新"),
      deleteWorkTemplateAction: (id: string) => runAction(() => deleteWorkTemplate(id), "工作模板已删除"),
      reorderWorkTemplateAction: (templateIds: string[]) => runAction(() => reorderWorkTemplates(templateIds), "模板顺序已保存"),
      generateRoutineWorkAction: () => {
        const result = runAction(() => syncRoutineWorkForDate(), "例行工作已检查同步");
        if (result?.warnings.length) {
          setNotice(result.warnings[0]);
          window.setTimeout(() => setNotice(""), 4200);
        } else if (result?.created.length === 0 && result.updated.length === 0) {
          setNotice("今日例行工作已是最新");
          window.setTimeout(() => setNotice(""), 2400);
        }
      },
      skipRoutineWorkAction: (id: string, reason?: string) => runAction(() => skipRoutineWorkItem(id, reason), "本次例行工作已跳过"),
      postponeRoutineWorkAction: (id: string, targetDate: string) => runAction(() => postponeRoutineWorkItem(id, targetDate), "例行工作已顺延"),
      createIdeaAction: (input: IdeaInput) => runAction(() => createIdea(input), "想法已保存"),
      updateIdeaAction: (id: string, input: IdeaInput) => runAction(() => updateIdea(id, input), "想法已更新"),
      deleteIdeaAction: (id: string) => runAction(() => deleteIdea(id), "想法已删除"),
      convertIdeaToWorkAction: (id: string, input: WorkItemInput) => runAction(() => convertIdeaToWorkItem(id, input), "已转为工作内容"),
      convertIdeaToDiaryAction: (id: string, input: DiaryEntryInput) => runAction(() => convertIdeaToDiaryEntry(id, input), "已转为工作日记"),
      createProjectAction: (input: ProjectInput) => runAction(() => createProject(input), "项目已保存"),
      updateProjectAction: (id: string, input: ProjectInput) => runAction(() => updateProject(id, input), "项目已更新"),
      deleteProjectAction: (id: string) => runAction(() => deleteProject(id), "项目已删除"),
      reorderProjectAction: (projectIds: string[]) => runAction(() => reorderProjects(projectIds), "项目顺序已保存"),
      createCategoryAction: (input: CategoryInput) => runAction(() => createCategory(input), "分类已保存"),
      updateCategoryAction: (id: string, input: CategoryInput) => runAction(() => updateCategory(id, input), "分类已更新"),
      deleteCategoryAction: (id: string) => runAction(() => deleteCategory(id), "分类已删除"),
      updateWorkResponsibilitiesAction: (groups: WorkResponsibilityGroupInput[]) => runAction(() => updateWorkResponsibilities(groups), "工作职责已保存"),
      importDashboard: (payload: string | DashboardData) => runAction(() => importData(payload), "数据已导入"),
      clearDashboard: () => runAction(() => clearData(), "本地数据已清空"),
    }),
    [],
  );

  useEffect(() => {
    let checkedDate = "";
    function syncTodayRoutines() {
      const today = todayInputValue();
      const result = syncRoutineWorkForDate(today);
      checkedDate = today;
      if (result.created.length > 0 || result.updated.length > 0) setData(getDashboardData());
      if (result.warnings.length > 0) {
        setNotice(result.warnings[0]);
        window.setTimeout(() => setNotice(""), 4200);
      }
    }

    syncTodayRoutines();
    const handleFocus = () => syncTodayRoutines();
    const timer = window.setInterval(() => {
      if (todayInputValue() !== checkedDate) syncTodayRoutines();
    }, 60_000);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  function runAction<T>(work: () => T, successMessage: string): T | undefined {
    try {
      const result = work();
      setData(getDashboardData());
      setNotice(successMessage);
      window.setTimeout(() => setNotice(""), 2400);
      return result;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "操作失败，请稍后重试。");
      return undefined;
    }
  }

  function navigate(view: ViewKey) {
    setActiveView(view);
    setMobileMenuOpen(false);
  }

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((current) => {
      const next = !current;
      writeSidebarCollapsed(next);
      return next;
    });
  }

  return (
    <div className={`app-shell ${sidebarCollapsed ? "app-shell-sidebar-collapsed" : ""}`}>
      <button className="icon-button mobile-sidebar-toggle" type="button" aria-label="打开菜单" title="打开菜单" onClick={() => setMobileMenuOpen(true)}>
        <Menu size={19} />
      </button>
      <div className="app-body">
        <Sidebar
          activeView={activeView}
          collapsed={sidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          onNavigate={navigate}
          onToggleCollapsed={toggleSidebarCollapsed}
          onClose={() => setMobileMenuOpen(false)}
        />
        <main className="main-content">
          {notice && <div className="toast">{notice}</div>}
          {activeView === "dashboard" && <DashboardHome data={data} actions={actions} onNavigate={navigate} />}
          {activeView === "diary" && (
            <DiaryList
              entries={data.diaryEntries}
              projects={data.projects}
              onCreate={actions.createDiary}
              onUpdate={actions.updateDiary}
              onDelete={actions.deleteDiary}
            />
          )}
          {activeView === "work" && (
            <WorkItemList
              items={data.workItems}
              categories={data.categories}
              projects={data.projects}
              responsibilities={data.workResponsibilities}
              routineWorkTemplates={data.routineWorkTemplates}
              workTemplates={data.workTemplates}
              onCreate={actions.createWork}
              onUpdate={actions.updateWork}
              onDelete={actions.deleteWork}
              onUpdateResponsibilities={actions.updateWorkResponsibilitiesAction}
              onCreateRoutineWork={actions.createRoutineWorkAction}
              onUpdateRoutineWork={actions.updateRoutineWorkAction}
              onDeleteRoutineWork={actions.deleteRoutineWorkAction}
              onPauseRoutineWork={actions.pauseRoutineWorkAction}
              onResumeRoutineWork={actions.resumeRoutineWorkAction}
              onGenerateRoutineWork={actions.generateRoutineWorkAction}
              onSkipRoutineWorkItem={actions.skipRoutineWorkAction}
              onPostponeRoutineWorkItem={actions.postponeRoutineWorkAction}
              onCreateWorkTemplate={actions.createWorkTemplateAction}
              onUpdateWorkTemplate={actions.updateWorkTemplateAction}
              onDeleteWorkTemplate={actions.deleteWorkTemplateAction}
              onReorderWorkTemplates={actions.reorderWorkTemplateAction}
              onCreateCategory={actions.createCategoryAction}
              onUpdateCategory={actions.updateCategoryAction}
              onDeleteCategory={actions.deleteCategoryAction}
            />
          )}
          {activeView === "ideas" && (
            <IdeaList
              ideas={data.ideas}
              projects={data.projects}
              categories={data.categories}
              onCreate={actions.createIdeaAction}
              onUpdate={actions.updateIdeaAction}
              onDelete={actions.deleteIdeaAction}
              onConvertToWork={actions.convertIdeaToWorkAction}
              onConvertToDiary={actions.convertIdeaToDiaryAction}
            />
          )}
          {activeView === "projects" && (
            <ProjectList
              projects={data.projects}
              workItems={data.workItems}
              diaryEntries={data.diaryEntries}
              ideas={data.ideas}
              categories={data.categories}
              onCreate={actions.createProjectAction}
              onUpdate={actions.updateProjectAction}
              onDelete={actions.deleteProjectAction}
              onReorderProjects={actions.reorderProjectAction}
              onUpdateWork={actions.updateWork}
              onDeleteWork={actions.deleteWork}
              onUpdateDiary={actions.updateDiary}
              onDeleteDiary={actions.deleteDiary}
              onUpdateIdea={actions.updateIdeaAction}
              onDeleteIdea={actions.deleteIdeaAction}
              onConvertIdeaToWork={actions.convertIdeaToWorkAction}
              onConvertIdeaToDiary={actions.convertIdeaToDiaryAction}
            />
          )}
          {activeView === "categories" && (
            <CategoryManager
              categories={data.categories}
              workItems={data.workItems}
              onCreate={actions.createCategoryAction}
              onUpdate={actions.updateCategoryAction}
              onDelete={actions.deleteCategoryAction}
            />
          )}
          {activeView === "settings" && (
            <BackupPanel
              data={data}
              onExport={exportData}
              onImport={actions.importDashboard}
              onClear={actions.clearDashboard}
            />
          )}
        </main>
      </div>
      <MobileTabBar activeView={activeView} onNavigate={navigate} />
    </div>
  );
}

type DashboardActions = ReturnType<typeof useDashboardActionsShape>;

function useDashboardActionsShape() {
  return {
    createDiary: (_input: DiaryEntryInput) => undefined as unknown,
    updateDiary: (_id: string, _input: DiaryEntryInput) => undefined as unknown,
    deleteDiary: (_id: string) => undefined as unknown,
    createWork: (_input: WorkItemInput) => undefined as unknown,
    updateWork: (_id: string, _input: WorkItemInput) => undefined as unknown,
    deleteWork: (_id: string) => undefined as unknown,
    createRoutineWorkAction: (_input: RoutineWorkTemplateInput) => undefined as unknown,
    updateRoutineWorkAction: (_id: string, _input: RoutineWorkTemplateInput, _mode?: "future" | "sync_open") => undefined as unknown,
    deleteRoutineWorkAction: (_id: string, _action?: "keep" | "skip" | "delete") => undefined as unknown,
    pauseRoutineWorkAction: (
      _id: string,
      _pendingTaskPolicy?: RoutineWorkTemplateInput["pendingTaskPolicy"],
      _pausedUntil?: string,
      _resumeStrategy?: RoutineWorkTemplateInput["resumeStrategy"],
    ) => undefined as unknown,
    resumeRoutineWorkAction: (_id: string, _strategy?: RoutineWorkTemplateInput["resumeStrategy"]) => undefined as unknown,
    createWorkTemplateAction: (_input: WorkTemplateInput) => undefined as unknown,
    updateWorkTemplateAction: (_id: string, _input: WorkTemplateInput) => undefined as unknown,
    deleteWorkTemplateAction: (_id: string) => undefined as unknown,
    reorderWorkTemplateAction: (_templateIds: string[]) => undefined as unknown,
    generateRoutineWorkAction: () => undefined as unknown,
    skipRoutineWorkAction: (_id: string, _reason?: string) => undefined as unknown,
    postponeRoutineWorkAction: (_id: string, _targetDate: string) => undefined as unknown,
    createIdeaAction: (_input: IdeaInput) => undefined as unknown,
    updateIdeaAction: (_id: string, _input: IdeaInput) => undefined as unknown,
    deleteIdeaAction: (_id: string) => undefined as unknown,
    convertIdeaToWorkAction: (_id: string, _input: WorkItemInput) => undefined as unknown,
    convertIdeaToDiaryAction: (_id: string, _input: DiaryEntryInput) => undefined as unknown,
    updateProjectAction: (_id: string, _input: ProjectInput) => undefined as unknown,
    deleteProjectAction: (_id: string) => undefined as unknown,
    reorderProjectAction: (_projectIds: string[]) => undefined as unknown,
    updateWorkResponsibilitiesAction: (_groups: WorkResponsibilityGroupInput[]) => undefined as unknown,
  };
}

interface DashboardHomeProps {
  data: DashboardData;
  actions: DashboardActions;
  onNavigate: (view: ViewKey) => void;
}

function DashboardHome({ data, actions, onNavigate }: DashboardHomeProps) {
  const [recordDetail, setRecordDetail] = useState<StatRecord | null>(null);
  const [editingDetail, setEditingDetail] = useState(false);
  const workItem = recordDetail?.kind === "work" ? data.workItems.find((item) => item.id === recordDetail.id) : null;
  const diaryEntry = recordDetail?.kind === "diary" ? data.diaryEntries.find((entry) => entry.id === recordDetail.id) : null;
  const idea = recordDetail?.kind === "idea" ? data.ideas.find((entry) => entry.id === recordDetail.id) : null;
  const project = recordDetail?.kind === "project" ? data.projects.find((entry) => entry.id === recordDetail.id) : null;

  function closeRecordDetail() {
    setRecordDetail(null);
    setEditingDetail(false);
  }

  return (
    <div className="dashboard-home">
      <StatCards data={data} onOpenRecordDetail={setRecordDetail} onUpdateWork={actions.updateWork} />
      <div className="dashboard-grid">
        <QuickCapture
          categories={data.categories}
          projects={data.projects}
          onCreateDiary={actions.createDiary}
          onCreateIdea={actions.createIdeaAction}
          onCreateWorkItem={actions.createWork}
        />
        <WorkCompletionOverview items={data.workItems} />
        <WorkPreview
          categories={data.categories}
          items={data.workItems}
          projects={data.projects}
          onUpdateWork={actions.updateWork}
          onSkipRoutineWork={actions.skipRoutineWorkAction}
          onPostponeRoutineWork={actions.postponeRoutineWorkAction}
          onOpenWork={(workId) => {
            const selected = data.workItems.find((item) => item.id === workId);
            setRecordDetail({ id: workId, kind: "work", title: selected?.title || "", status: selected?.status || "" });
          }}
          onOpenProject={(projectId) => {
            const selected = data.projects.find((item) => item.id === projectId);
            setRecordDetail({ id: projectId, kind: "project", title: selected?.name || "", status: selected?.status || "" });
          }}
        />
        <DiaryPreview entries={data.diaryEntries} projects={data.projects} onViewAll={() => onNavigate("diary")} />
        <ProjectOverview projects={data.projects} />
      </div>
      {workItem && (
        <WorkItemDetailModal
          item={workItem}
          categories={data.categories}
          projects={data.projects}
          editing={editingDetail}
          onEdit={() => setEditingDetail(true)}
          onCancelEdit={() => setEditingDetail(false)}
          onClose={closeRecordDetail}
          onUpdate={(input) => {
            actions.updateWork(workItem.id, input);
            setEditingDetail(false);
          }}
          onDelete={() => {
            actions.deleteWork(workItem.id);
            closeRecordDetail();
          }}
          onSkipRoutine={() => {
            const reason = window.prompt("本次跳过原因，可留空。") || "";
            actions.skipRoutineWorkAction(workItem.id, reason);
            closeRecordDetail();
          }}
          onPostponeRoutine={(targetDate) => {
            actions.postponeRoutineWorkAction(workItem.id, targetDate);
            closeRecordDetail();
          }}
          onPauseRoutine={() => {
            const ruleId = workItem.routineRuleId || workItem.sourceTemplateId;
            if (!ruleId) return;
            actions.pauseRoutineWorkAction(ruleId, "keep");
            closeRecordDetail();
          }}
          onOpenRoutineRule={() => {
            onNavigate("work");
            closeRecordDetail();
          }}
        />
      )}
      {diaryEntry && (
        <DiaryDetailModal
          entry={diaryEntry}
          projects={data.projects}
          editing={editingDetail}
          onEdit={() => setEditingDetail(true)}
          onCancelEdit={() => setEditingDetail(false)}
          onClose={closeRecordDetail}
          onUpdate={(input) => {
            actions.updateDiary(diaryEntry.id, input);
            setEditingDetail(false);
          }}
          onDelete={() => {
            actions.deleteDiary(diaryEntry.id);
            closeRecordDetail();
          }}
        />
      )}
      {idea && (
        <IdeaDetailModal
          idea={idea}
          projects={data.projects}
          categories={data.categories}
          editing={editingDetail}
          onEdit={() => setEditingDetail(true)}
          onCancelEdit={() => setEditingDetail(false)}
          onClose={closeRecordDetail}
          onUpdate={(input) => {
            actions.updateIdeaAction(idea.id, input);
            setEditingDetail(false);
          }}
          onDelete={() => {
            actions.deleteIdeaAction(idea.id);
            closeRecordDetail();
          }}
          onConvertToWork={(input) => actions.convertIdeaToWorkAction(idea.id, input)}
          onConvertToDiary={(input) => actions.convertIdeaToDiaryAction(idea.id, input)}
        />
      )}
      {project && (
        <ProjectDetailModal
          project={project}
          workItems={data.workItems}
          diaryEntries={data.diaryEntries}
          ideas={data.ideas}
          editing={editingDetail}
          onEdit={() => setEditingDetail(true)}
          onCancelEdit={() => setEditingDetail(false)}
          onClose={closeRecordDetail}
          onUpdate={(input) => {
            actions.updateProjectAction(project.id, input);
            setEditingDetail(false);
          }}
          onDelete={() => {
            actions.deleteProjectAction(project.id);
            closeRecordDetail();
          }}
          onOpenLinkedRecord={(record) => setRecordDetail({ id: record.id, kind: record.kind, title: "", status: "" })}
        />
      )}    </div>
  );
}

export default App;
