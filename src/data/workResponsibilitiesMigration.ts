import type { DashboardData, WorkResponsibilityGroup } from "../types/dashboard";

export const WORK_RESPONSIBILITIES_V1_MIGRATION = "work-responsibilities-v1";

const templateWorkResponsibilities: WorkResponsibilityGroup[] = [
  {
    id: "resp_plan_review",
    name: "计划与复盘",
    sortOrder: 10,
    items: [
      "每周整理重点事项和待办清单",
      "为重要事项设置明确的下一步行动",
      "定期复盘已完成任务和未完成原因",
      "把阶段结论沉淀到项目记录中",
    ],
  },
  {
    id: "resp_knowledge_learning",
    name: "知识库与学习",
    sortOrder: 20,
    items: [
      "整理常用资料、笔记和参考链接",
      "维护知识库分类和标签规则",
      "记录学习主题、练习内容和复盘结论",
      "把可复用经验整理为模板或清单",
    ],
  },
  {
    id: "resp_project_tracking",
    name: "项目跟进",
    sortOrder: 30,
    items: [
      "维护项目背景、目标和验收标准",
      "跟踪项目进度、风险和阻塞事项",
      "记录执行步骤和阶段结果",
      "在项目结束后补充复盘记录",
    ],
  },
  {
    id: "resp_idea_capture",
    name: "想法收集",
    sortOrder: 40,
    items: [
      "随时记录临时想法和待整理内容",
      "将可执行想法转化为任务或日记",
      "定期归档已处理或暂不处理的想法",
      "避免让零散想法影响当前重点任务",
    ],
  },
];

const exampleResponsibilityNames = new Set(["用户运营", "新媒体运营", "User Ops", "Media Ops", "新职责分类"]);
const templateResponsibilityNameSet = new Set(templateWorkResponsibilities.map((group) => group.name));

export function applyWorkResponsibilitiesV1Migration(data: DashboardData): { data: DashboardData; changed: boolean } {
  if (data.migrations.includes(WORK_RESPONSIBILITIES_V1_MIGRATION)) {
    return { data, changed: false };
  }

  const currentGroups = data.workResponsibilities;
  const shouldReplace = currentGroups.length === 0 || currentGroups.every((group) => exampleResponsibilityNames.has(group.name));
  const nextResponsibilities = shouldReplace ? cloneTemplateResponsibilities() : mergeTemplateResponsibilities(currentGroups);

  return {
    data: {
      ...data,
      workResponsibilities: nextResponsibilities,
      migrations: [...data.migrations, WORK_RESPONSIBILITIES_V1_MIGRATION],
    },
    changed: true,
  };
}

export function getFormalWorkResponsibilitiesV1Summary() {
  return {
    groupCount: templateWorkResponsibilities.length,
    itemCount: templateWorkResponsibilities.reduce((total, group) => total + group.items.length, 0),
  };
}

function mergeTemplateResponsibilities(currentGroups: WorkResponsibilityGroup[]): WorkResponsibilityGroup[] {
  const currentByName = new Map(currentGroups.map((group) => [group.name, group]));
  const templateGroups = cloneTemplateResponsibilities().map((templateGroup) => ({
    ...templateGroup,
    ...(currentByName.has(templateGroup.name) ? { id: templateGroup.id, sortOrder: templateGroup.sortOrder } : {}),
  }));
  const customGroups = currentGroups
    .filter((group) => !templateResponsibilityNameSet.has(group.name) && !exampleResponsibilityNames.has(group.name))
    .map((group, index) => ({ ...group, sortOrder: 50 + index * 10 }));

  return [...templateGroups, ...customGroups];
}

function cloneTemplateResponsibilities() {
  return templateWorkResponsibilities.map((group) => ({ ...group, items: [...group.items] }));
}
