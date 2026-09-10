import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Project } from "../src/types/dashboard";
import { createProject, deleteProject, moveProjectNode } from "../src/data/repository";
import { createEmptyDashboardData, readDashboard, writeDashboard } from "../src/data/storage";
import {
  canMoveProject,
  getProjectChildren,
  getProjectDescendantIds,
  getProjectDropPosition,
  getProjectNumber,
  getRootProjects,
} from "../src/utils/projectTree";

const memory = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) || null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
  },
});

function project(id: string, parentId: string | null, depth: number, sortOrder: number, name = id): Project {
  return {
    id,
    name,
    type: "work",
    description: "",
    content: "",
    progress: 0,
    status: "未开始",
    parentId,
    rootProjectId: parentId ? "root" : id,
    depth,
    sortOrder,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    executionSteps: [],
  };
}

function dashboardWithProjects(projects: Project[]) {
  const dashboard = createEmptyDashboardData();
  dashboard.projects = projects;
  writeDashboard(dashboard);
  return dashboard;
}

assert.equal(getProjectDropPosition(0, 100), "before");
assert.equal(getProjectDropPosition(29, 100), "before");
assert.equal(getProjectDropPosition(30, 100), "inside");
assert.equal(getProjectDropPosition(70, 100), "inside");
assert.equal(getProjectDropPosition(71, 100), "after");
assert.equal(getProjectDropPosition(100, 100), "after");

const root = project("root", null, 1, 10, "一、中秋运营规划");
const sibling = project("sibling", "root", 2, 10, "PC落地页");
const otherSibling = project("other-sibling", "root", 2, 20, "移动端落地页");
const otherRoot = project("other-root", null, 1, 20, "其他项目");
const deepParent = project("deep-parent", "other-sibling", 3, 10, "首页设计");
const deeperParent = project("deeper-parent", "deep-parent", 4, 10, "Banner");
const deepestParent = project("deepest-parent", "deeper-parent", 5, 10, "主视觉");
const projects = [root, sibling, otherSibling, otherRoot, deepParent, deeperParent, deepestParent];

assert.equal(canMoveProject("sibling", "root", projects).ok, true, "同主项目内可以放入目标父级");
assert.equal(canMoveProject("sibling", "other-sibling", projects).ok, true, "同主项目内可以移动到其他分支");
assert.equal(canMoveProject("sibling", null, projects).ok, false, "子项目不能脱离主项目成为根节点");
assert.equal(canMoveProject("root", "sibling", projects).ok, false, "不能移动到自身后代");
assert.equal(canMoveProject("sibling", "other-root", projects).ok, false, "不能跨主项目移动");
assert.equal(canMoveProject("sibling", "deepest-parent", projects).ok, false, "目标会超过 5 层时禁止放入");

dashboardWithProjects([root, sibling, otherSibling, otherRoot]);
let updated = moveProjectNode("other-sibling", "root", "before", "sibling");
let rootChildren = updated.filter((item) => item.parentId === "root").sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
assert.deepEqual(rootChildren.map((item) => item.id), ["other-sibling", "sibling"], "平级前插只调整兄弟顺序");
assert.equal(rootChildren.find((item) => item.id === "other-sibling")?.parentId, "root", "平级排序不修改 parentId");

updated = moveProjectNode("other-sibling", "sibling", "last");
assert.equal(updated.find((item) => item.id === "other-sibling")?.parentId, "sibling", "中部放入子级时才修改 parentId");
assert.equal(updated.find((item) => item.id === "other-sibling")?.depth, 3);
assert.throws(() => moveProjectNode("other-sibling", "sibling", "before", "missing"), /项目排序目标无效/);

dashboardWithProjects([root, sibling, otherSibling, otherRoot]);
updated = moveProjectNode("sibling", "root", "after", "other-sibling");
assert.deepEqual(updated.filter((item) => item.parentId === "root").sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((item) => item.id), ["other-sibling", "sibling"], "平级后插只调整兄弟顺序");

const appendRoot = project("append-root", null, 1, 10, "追加测试");
const appendA = project("append-a", "append-root", 2, 10, "已有一");
const appendB = project("append-b", "append-root", 2, 20, "已有二");
dashboardWithProjects([appendRoot, appendA, appendB]);
const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...appendInput } = appendRoot;
const appended = createProject({ ...appendInput, parentId: appendRoot.id });
assert.deepEqual(getProjectChildren(readDashboard().projects, appendRoot.id).map((item) => item.id), ["append-a", "append-b", appended.id], "新增子项目追加到同级末尾");

const subtreeRoot = project("subtree-root", null, 1, 10);
const movingParent = project("moving-parent", "subtree-root", 2, 10);
const movingChild = project("moving-child", "moving-parent", 3, 10);
const targetParent = project("target-parent", "subtree-root", 2, 20);
dashboardWithProjects([subtreeRoot, movingParent, movingChild, targetParent]);
updated = moveProjectNode("moving-parent", "target-parent", "last");
assert.equal(updated.find((item) => item.id === "moving-parent")?.parentId, "target-parent", "父项目移动后更换 parentId");
assert.equal(updated.find((item) => item.id === "moving-parent")?.depth, 3, "父项目移动后深度更新");
assert.equal(updated.find((item) => item.id === "moving-child")?.parentId, "moving-parent", "整棵子树保持父子关系");
assert.equal(updated.find((item) => item.id === "moving-child")?.depth, 4, "整棵子树深度同步更新");
updated = moveProjectNode("moving-child", "subtree-root", "last");
assert.equal(updated.find((item) => item.id === "moving-child")?.depth, 2, "子项目提升层级后深度更新");

const numberingRoot = project("number-root", null, 1, 10, "一、中秋运营规划");
const numberingRootTwo = project("number-root-two", null, 1, 20, "二、其他项目");
const numberingChild = project("number-child", "number-root", 2, 10, "PC落地页");
const numberingChildTwo = project("number-child-two", "number-root", 2, 20, "移动端落地页");
const numberingGrandchild = project("number-grandchild", "number-child", 3, 10, "首页设计");
const numberingGreatGrandchild = project("number-great-grandchild", "number-grandchild", 4, 10, "Banner");
const numberingLevelFive = project("number-level-five", "number-great-grandchild", 5, 10, "主视觉");
const numberingProjects = [numberingRoot, numberingRootTwo, numberingChild, numberingChildTwo, numberingGrandchild, numberingGreatGrandchild, numberingLevelFive];
assert.equal(getProjectNumber(numberingRoot, numberingProjects), "一、");
assert.equal(getProjectNumber(numberingRootTwo, numberingProjects), "二、");
assert.equal(getProjectNumber(numberingChild, numberingProjects), "1");
assert.equal(getProjectNumber(numberingChildTwo, numberingProjects), "2");
assert.equal(getProjectNumber(numberingGrandchild, numberingProjects), "1.1");
assert.equal(getProjectNumber(numberingGreatGrandchild, numberingProjects), "①");
assert.equal(getProjectNumber(numberingLevelFive, numberingProjects), "A");
assert.equal(numberingRoot.name, "一、中秋运营规划", "自动编号不改真实项目名称");
assert.equal(numberingChild.name, "PC落地页", "自动编号不把编号写入真实项目名称");
dashboardWithProjects(numberingProjects);
updated = moveProjectNode("number-root-two", null, "before", "number-root");
assert.equal(getProjectNumber(updated.find((item) => item.id === "number-root-two")!, updated), "一、", "根项目排序后编号实时更新");
assert.equal(getProjectNumber(updated.find((item) => item.id === "number-root")!, updated), "二、", "根项目排序后原项目编号实时更新");
assert.equal(getProjectNumber(updated.find((item) => item.id === "number-child")!, updated), "1", "子项目不继承主项目中文编号");
updated = moveProjectNode("number-great-grandchild", "number-root", "last");
assert.equal(updated.find((item) => item.id === "number-great-grandchild")?.depth, 2, "调整父级后项目层级实时更新");
assert.equal(getProjectNumber(updated.find((item) => item.id === "number-level-five")!, updated), "3.1", "调整父级后编号按新层级实时更新");

const deleteRoot = project("delete-root", null, 1, 10, "待删除父项目");
const deleteChild = project("delete-child", "delete-root", 2, 10, "待删除子项目");
dashboardWithProjects([deleteRoot, deleteChild]);
const deleteData = readDashboard();
deleteData.workItems = [{ id: "work-1", title: "推进事项", projectId: "delete-child", linkedProjectIds: ["delete-child"] } as never];
deleteData.diaryEntries = [{ id: "diary-1", linkedProjectIds: ["delete-root"] } as never];
writeDashboard(deleteData);
deleteProject("delete-root");
const afterDelete = readDashboard();
assert.equal(afterDelete.projects.length, 0, "删除父项目级联删除整棵子树");
assert.equal(afterDelete.workItems[0]?.projectId, "", "删除后推进内容项目引用移除");
assert.deepEqual(afterDelete.diaryEntries[0]?.linkedProjectIds, [], "删除后日记项目引用移除");

const sourceChecks = [
  ["src/components/Projects/ProjectList.tsx", /drop-\$\{dropTarget\.position\}|dropPosition/, "拖拽视觉反馈"],
  ["src/components/Projects/ProjectList.tsx", /搜索项目名称 \/ 子项目/, "项目搜索"],
  ["src/components/Projects/ProjectList.tsx", /确认删除项目？/, "自定义删除确认"],
  ["src/components/Projects/ProjectNodeForm.tsx", /className="checkbox-field"/, "新增子项目延期复选框"],
  ["src/components/Projects/ProjectForm.tsx", /className="checkbox-field"/, "编辑项目延期复选框"],
  ["src/components/Common/ConfirmDialog.tsx", /确认删除/, "危险态确认按钮"],
  ["src/components/Projects/ProjectList.tsx", /新增子项目 - \$\{state\.parent\.name\}/, "子项目标题"],
  ["src/data/cloudSync.ts", /dashboard_data/, "Supabase 项目 JSON 同步"],
  ["src/index.css", /\.modal\.project-node-modal/, "项目弹窗响应式宽度"],
  ["src/index.css", /@media \(max-width: 520px\)/, "390px 响应式规则"],
] as const;
for (const [file, pattern, label] of sourceChecks) {
  assert.match(readFileSync(file, "utf8"), pattern, label);
}
const projectListSource = readFileSync("src/components/Projects/ProjectList.tsx", "utf8");
assert.doesNotMatch(projectListSource, /quadrantFilter|statusFilter|sortMode/, "项目页已移除 3 个筛选项");
assert.match(projectListSource, /depth < 5/, "第 5 层隐藏新增子项目入口");

assert.equal(getProjectDescendantIds("number-root", numberingProjects).length, 5, "完整五层结构可遍历");
assert.equal(getRootProjects(numberingProjects).length, 2, "主项目按根节点识别");
console.log("project tree tests passed");
