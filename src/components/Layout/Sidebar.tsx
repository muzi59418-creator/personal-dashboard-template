import { useEffect, useState } from "react";
import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  Lightbulb,
  Settings,
  X,
} from "lucide-react";
import { APP_VERSION } from "../../data/appVersion";

export type ViewKey = "dashboard" | "diary" | "work" | "ideas" | "projects" | "categories" | "settings";

export const navItems: Array<{ key: ViewKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: "dashboard", label: "仪表盘", icon: LayoutDashboard },
  { key: "work", label: "工作内容", icon: ClipboardList },
  { key: "diary", label: "工作日记", icon: BookOpenText },
  { key: "ideas", label: "灵感", icon: Lightbulb },
  { key: "projects", label: "项目管理", icon: FolderKanban },
  { key: "settings", label: "设置/备份", icon: Settings },
];

interface SidebarProps {
  activeView: ViewKey;
  collapsed: boolean;
  mobileOpen: boolean;
  onNavigate: (view: ViewKey) => void;
  onToggleCollapsed: () => void;
  onClose: () => void;
}

export function Sidebar({ activeView, collapsed, mobileOpen, onNavigate, onToggleCollapsed, onClose }: SidebarProps) {
  const now = useLiveTime();

  return (
    <>
      <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-mobile-head">
          <span>导航</span>
          <button className="icon-button" type="button" aria-label="关闭菜单" title="关闭菜单" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <button
          className="sidebar-collapse-button"
          type="button"
          aria-label={collapsed ? "展开左侧导航" : "收起左侧导航"}
          title={collapsed ? "展开左侧导航" : "收起左侧导航"}
          onClick={onToggleCollapsed}
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
        <nav aria-label="主菜单">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={`nav-button ${activeView === item.key ? "active" : ""}`}
                type="button"
                title={collapsed ? item.label : undefined}
                onClick={() => onNavigate(item.key)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-clock" aria-label="当前时间">
          <strong>{formatClockTime(now)}</strong>
          <span>{formatClockDate(now)}</span>
          <small>v{APP_VERSION}</small>
        </div>
      </aside>
      {mobileOpen && <button className="sidebar-scrim" type="button" aria-label="关闭菜单遮罩" onClick={onClose} />}
    </>
  );
}

function useLiveTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

function formatClockTime(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatClockDate(date: Date): string {
  const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(date);
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()} · ${weekday}`;
}
