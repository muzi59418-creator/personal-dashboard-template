import type { DashboardData, DiaryEntry, Idea, Project, WorkItem } from "../types/dashboard";
import { PROJECT_STATUSES, WORK_STATUSES } from "../types/dashboard";
import { isIsoDateInCurrentWeek, isSameDate, todayInputValue } from "./date";

export type StatCardKey =
  | "todayRecords"
  | "weeklyWork"
  | "weeklyCompleted"
  | "pendingWork"
  | "activeProjects"
  | "unorganizedIdeas";

export type StatRecordKind = "diary" | "work" | "idea" | "project";

export interface StatRecord {
  id: string;
  kind: StatRecordKind;
  title: string;
  status: string;
}

export interface StatRecordSection {
  title: string;
  records: StatRecord[];
}

export interface DashboardStats {
  todayRecords: number;
  weeklyWork: number;
  weeklyCompleted: number;
  pendingWork: number;
  activeProjects: number;
  unorganizedIdeas: number;
  details: Record<StatCardKey, StatRecordSection[]>;
}

const pendingWorkStatus = WORK_STATUSES[0];
const activeWorkStatus = WORK_STATUSES[1];
const completedWorkStatus = WORK_STATUSES[2];
const activeProjectStatus = PROJECT_STATUSES[1];

export function calculateStats(data: DashboardData): DashboardStats {
  const today = todayInputValue();
  const todayDiary = data.diaryEntries.filter((entry) => isTodayCreated(entry, today));
  const todayWork = data.workItems.filter((item) => isTodayCreated(item, today));
  const todayIdeas = data.ideas.filter((idea) => isTodayCreated(idea, today));
  const weeklyWork = data.workItems.filter((item) => isThisWeek(item.createdAt) || isThisWeek(item.updatedAt));
  const weeklyCompleted = data.workItems.filter((item) => isCompletedThisWeek(item));
  const pendingWork = data.workItems.filter((item) => item.status === pendingWorkStatus || item.status === activeWorkStatus);
  const activeProjects = data.projects.filter((project) => project.status === activeProjectStatus);
  const unorganizedIdeas = data.ideas.filter((idea) => idea.status === "unorganized");

  return {
    todayRecords: todayDiary.length + todayWork.length + todayIdeas.length,
    weeklyWork: weeklyWork.length,
    weeklyCompleted: weeklyCompleted.length,
    pendingWork: pendingWork.length,
    activeProjects: activeProjects.length,
    unorganizedIdeas: unorganizedIdeas.length,
    details: {
      todayRecords: [
        { title: "工作日记", records: todayDiary.map(toDiaryRecord) },
        { title: "工作内容", records: todayWork.map(toWorkRecord) },
        { title: "临时想法 / 图文记录", records: todayIdeas.map(toIdeaRecord) },
      ],
      weeklyWork: [{ title: "本周新增或更新的工作内容", records: weeklyWork.map(toWorkRecord) }],
      weeklyCompleted: [{ title: "本周完成的工作内容", records: weeklyCompleted.map(toWorkRecord) }],
      pendingWork: [{ title: "待处理 / 进行中的工作内容", records: pendingWork.map(toWorkRecord) }],
      activeProjects: [{ title: "进行中的项目", records: activeProjects.map(toProjectRecord) }],
      unorganizedIdeas: [{ title: "待整理内容", records: unorganizedIdeas.map(toIdeaRecord) }],
    },
  };
}

function isTodayCreated(item: { createdAt?: string; date?: string }, today: string) {
  return isSameDate(datePart(item.createdAt) || item.date || "", today);
}

function isThisWeek(value?: string) {
  return isIsoDateInCurrentWeek(datePart(value));
}

function isCompletedThisWeek(item: WorkItem) {
  const completedAt = (item as WorkItem & { completedAt?: string }).completedAt;
  if (completedAt) return isThisWeek(completedAt);
  return item.status === completedWorkStatus && isThisWeek(item.updatedAt);
}

function datePart(value?: string) {
  return value ? value.slice(0, 10) : "";
}

function toDiaryRecord(entry: DiaryEntry): StatRecord {
  return {
    id: entry.id,
    kind: "diary",
    title: entry.title || "未命名工作日记",
    status: "工作日记",
  };
}

function toWorkRecord(item: WorkItem): StatRecord {
  return {
    id: item.id,
    kind: "work",
    title: item.title || "未命名工作内容",
    status: item.status,
  };
}

function toIdeaRecord(idea: Idea): StatRecord {
  return {
    id: idea.id,
    kind: "idea",
    title: idea.title || idea.content.slice(0, 36) || (idea.attachments?.length ? "未命名图文记录" : "未命名临时想法"),
    status: idea.status === "unorganized" ? "未整理" : idea.status === "organized" ? "已整理" : idea.status === "converted" ? "已转化" : "已归档",
  };
}

function toProjectRecord(project: Project): StatRecord {
  return {
    id: project.id,
    kind: "project",
    title: project.name || "未命名项目",
    status: project.status,
  };
}
