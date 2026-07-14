import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const today = "2026-07-07";

function progressSummary(project) {
  const items = Array.isArray(project.executionSteps) ? project.executionSteps : [];
  if (items.length === 0) return { hasProgressItems: false, total: 0, completed: 0, percent: null, label: "未拆分推进事项" };
  const completed = items.filter((item) => item.status === "done").length;
  return { hasProgressItems: true, total: items.length, completed, percent: Math.round((completed / items.length) * 100) };
}

function averageProgress(projects) {
  const summaries = projects.map(progressSummary).filter((summary) => summary.hasProgressItems);
  if (summaries.length === 0) return null;
  return Math.round(summaries.reduce((sum, summary) => sum + summary.percent, 0) / summaries.length);
}

function buildProgressItemWorkInput(project, item, fallbackCategoryId) {
  return {
    title: item.name,
    categoryId: fallbackCategoryId,
    status: "待处理",
    content: item.description,
    date: item.dueDate || "",
    plannedDate: "",
    projectId: project.id,
    linkedProjectIds: [project.id],
    sourceProjectType: "progressItem",
    sourceProjectId: project.id,
    sourceProjectProgressItemId: item.id,
    sourceProjectProgressItemName: item.name,
    images: [],
  };
}

function buildNextActionWorkInput(project, fallbackCategoryId) {
  return {
    title: project.nextAction || "",
    categoryId: fallbackCategoryId,
    status: "待处理",
    content: project.nextAction || "",
    date: project.dueDate || today,
    plannedDate: today,
    projectId: project.id,
    linkedProjectIds: [project.id],
    sourceProjectType: "nextAction",
    sourceProjectId: project.id,
    images: [],
  };
}

function syncProgressItem(project, progressItemId, shouldSync) {
  if (!shouldSync) return project;
  return {
    ...project,
    executionSteps: project.executionSteps.map((item) =>
      item.id === progressItemId ? { ...item, status: "done", completedAt: item.completedAt || today } : item,
    ),
  };
}

function relatedWork(project, workItems) {
  const seen = new Set();
  return workItems
    .filter((item) => item.projectId === project.id || item.linkedProjectIds?.includes(project.id))
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
}

function validateBackup(value) {
  return Boolean(
    value &&
      Array.isArray(value.diaryEntries) &&
      Array.isArray(value.workItems) &&
      Array.isArray(value.ideas) &&
      Array.isArray(value.categories) &&
      Array.isArray(value.projects),
  );
}

const splitProject = {
  id: "project_a",
  status: "进行中",
  progress: 10,
  nextAction: "整理验收材料",
  dueDate: "2026-07-20",
  executionSteps: [
    { id: "item_1", name: "完成方案", description: "输出第一版方案", status: "done", dueDate: "2026-07-01", completedAt: "2026-07-01" },
    { id: "item_2", name: "确认口径", description: "与相关方确认", status: "done", dueDate: "2026-07-03", completedAt: "" },
    { id: "item_3", name: "补充材料", description: "补齐附件", status: "todo", dueDate: "2026-07-08", completedAt: "" },
    { id: "item_4", name: "内部评审", description: "评审风险点", status: "doing", dueDate: "", completedAt: "" },
    { id: "item_5", name: "提交验收", description: "发出验收包", status: "todo", dueDate: "", completedAt: "" },
  ],
};
const emptyProject = { id: "project_empty", status: "进行中", progress: 80, executionSteps: [] };

assert.equal(progressSummary(emptyProject).label, "未拆分推进事项");
assert.equal(averageProgress([emptyProject]), null);
assert.equal(progressSummary(splitProject).percent, 40);
assert.deepEqual(
  progressSummary({ ...splitProject, status: "进行中", executionSteps: splitProject.executionSteps.map((item) => ({ ...item, status: "done" })) }),
  { hasProgressItems: true, total: 5, completed: 5, percent: 100 },
);
assert.equal(splitProject.status, "进行中");

const progressWork = buildProgressItemWorkInput(splitProject, splitProject.executionSteps[2], "cat_default");
assert.equal(progressWork.projectId, splitProject.id);
assert.equal(progressWork.title, "补充材料");
assert.equal(progressWork.content, "补齐附件");
assert.equal(progressWork.date, "2026-07-08");
assert.equal(progressWork.sourceProjectType, "progressItem");
assert.equal(progressWork.sourceProjectProgressItemId, "item_3");

const nextActionWork = buildNextActionWorkInput(splitProject, "cat_default");
assert.equal(nextActionWork.title, "整理验收材料");
assert.equal(nextActionWork.plannedDate, today);
assert.equal(nextActionWork.sourceProjectType, "nextAction");

const secondProgressWork = { ...progressWork, id: "work_2", title: "补充材料复核" };
assert.notEqual(progressWork.title, secondProgressWork.title);

assert.equal(syncProgressItem(splitProject, "item_3", true).executionSteps.find((item) => item.id === "item_3").status, "done");
assert.equal(syncProgressItem(splitProject, "item_3", false).executionSteps.find((item) => item.id === "item_3").status, "todo");
assert.equal(nextActionWork.sourceProjectProgressItemId, undefined);

const deletedProgressItemProject = { ...splitProject, executionSteps: splitProject.executionSteps.filter((item) => item.id !== "item_3") };
assert.equal(deletedProgressItemProject.executionSteps.some((item) => item.id === "item_3"), false);
assert.equal(progressWork.sourceProjectProgressItemId, "item_3");

const related = relatedWork(splitProject, [
  { id: "work_1", projectId: "project_a", linkedProjectIds: ["project_a"] },
  { id: "work_1", projectId: "project_a", linkedProjectIds: ["project_a"] },
  { id: "work_2", projectId: "", linkedProjectIds: ["project_a"] },
]);
assert.equal(related.length, 2);

const oldBackup = { diaryEntries: [], workItems: [], ideas: [], categories: [], projects: [{ ...emptyProject, progress: 80 }] };
assert.equal(validateBackup(oldBackup), true);
const newBackup = {
  version: "1.3.0",
  appVersion: "1.4.4",
  schemaVersion: "1.3.0",
  diaryEntries: [],
  workItems: [progressWork, nextActionWork],
  ideas: [],
  categories: [],
  projects: [splitProject, emptyProject],
};
assert.equal(validateBackup(newBackup), true);

const projectDetailSource = readFileSync("src/components/Projects/ProjectDetailModal.tsx", "utf8");
assert.match(projectDetailSource, /<WorkItemForm/);
assert.match(projectDetailSource, /sourceProjectType: "progressItem"/);
assert.match(projectDetailSource, /sourceProjectType: "nextAction"/);

const projectOverviewSource = readFileSync("src/components/Dashboard/ProjectOverview.tsx", "utf8");
assert.match(projectOverviewSource, /getAverageProjectProgress/);
assert.doesNotMatch(projectOverviewSource, /project\.progress/);

const projectCardSource = readFileSync("src/components/Projects/ProjectCard.tsx", "utf8");
assert.match(projectCardSource, /getProjectProgressSummary/);
assert.doesNotMatch(projectCardSource, /project\.progress/);

const workPreviewSource = readFileSync("src/components/Dashboard/WorkPreview.tsx", "utf8");
assert.match(workPreviewSource, /\.filter\(isProjectActionable\)/);
assert.match(workPreviewSource, /step\.status !== "done"/);
assert.doesNotMatch(workPreviewSource, /getProjectStepPlanDate\(step\) === today/);
assert.match(workPreviewSource, /project\.status === "未开始" \|\| project\.status === "进行中" \|\| project\.status === "长期维护"/);
assert.match(workPreviewSource, /暂无待处理推进事项/);

console.log("projectProgress tests passed");
