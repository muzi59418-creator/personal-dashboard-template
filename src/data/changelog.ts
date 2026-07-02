export type ChangelogType = "新增" | "优化" | "说明";

export interface ChangelogEntry {
  date: string;
  title: string;
  type: ChangelogType;
  modules: string[];
  summary: string;
  status: "模板内容";
}

export const changelogEntries: ChangelogEntry[] = [
  {
    date: "模板版本 1",
    title: "开源模板初始化",
    type: "新增",
    modules: ["演示数据", "localStorage", "项目文档"],
    summary: "将仪表板整理为可复用模板，默认仅包含通用演示数据，不包含真实个人工作记录。",
    status: "模板内容",
  },
  {
    date: "模板版本 1",
    title: "本地数据管理入口",
    type: "优化",
    modules: ["设置 / 备份", "演示数据"],
    summary: "提供导入、导出、清空本地数据和恢复演示数据入口，方便使用者试用和重置。",
    status: "模板内容",
  },
  {
    date: "模板版本 1",
    title: "模板使用说明",
    type: "说明",
    modules: ["README", "部署说明"],
    summary: "补充本地启动、构建、数据存储、GitHub Template、Vercel 和 Cloudflare Pages 部署说明。",
    status: "模板内容",
  },
];
