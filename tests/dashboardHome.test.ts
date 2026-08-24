import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DiaryPreview } from "../src/components/Dashboard/DiaryPreview";
import { WorkPreview } from "../src/components/Dashboard/WorkPreview";
import { Sidebar } from "../src/components/Layout/Sidebar";
import { getRecentDiaryEntries } from "../src/utils/diaryPreview";
import type { DiaryEntry } from "../src/types/dashboard";

function diary(id: string, date: string, updatedAt = `${date}T08:00:00.000Z`): DiaryEntry {
  return { id, date, title: id, content: id, tags: [], linkedProjectIds: [], images: [], createdAt: updatedAt, updatedAt };
}

const entries = [
  diary("today-early", "2026-08-20", "2026-08-20T08:00:00.000Z"),
  diary("today-late", "2026-08-20", "2026-08-20T09:00:00.000Z"),
  diary("yesterday", "2026-08-19"),
  diary("third-day", "2026-08-18"),
  diary("fourth-day", "2026-08-17"),
  diary("future", "2026-08-21"),
];

assert.deepEqual(getRecentDiaryEntries(entries, "2026-08-20").map((entry) => entry.id), ["today-late", "today-early", "yesterday", "third-day"]);

const diaryEmptyHtml = renderToStaticMarkup(createElement(DiaryPreview, { entries: [], projects: [], onViewAll: () => undefined }));
assert.match(diaryEmptyHtml, /最近 3 天暂无工作日记/);
assert.match(diaryEmptyHtml, /diary-preview-panel-empty/);

const workbenchHtml = renderToStaticMarkup(createElement(WorkPreview, {
  categories: [],
  items: [],
  projects: [],
  onOpenWork: () => undefined,
  onOpenProject: () => undefined,
  onUpdateWork: () => undefined,
  onUpdateProject: () => undefined,
}));
assert.match(workbenchHtml, /暂无优先处理事项/);
assert.match(workbenchHtml, /暂无待处理例行工作/);
assert.match(workbenchHtml, /暂无待处理推进事项/);
assert.match(workbenchHtml, /today-work-panel-empty/);
assert.doesNotMatch(workbenchHtml, /compact-empty-state|today-routine-empty/);

const accountName = "这是一个用于验证省略处理的超长账号名称@example.com";
const sidebarHtml = renderToStaticMarkup(createElement(Sidebar, {
  activeView: "dashboard",
  collapsed: true,
  mobileOpen: false,
  onNavigate: () => undefined,
  onToggleCollapsed: () => undefined,
  onClose: () => undefined,
  accountName,
  onSignOut: async () => undefined,
}));
assert.match(sidebarHtml, new RegExp(accountName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(sidebarHtml, /sidebar-account-avatar/);
assert.match(sidebarHtml, /退出登录/);

console.log("dashboard home tests passed");
