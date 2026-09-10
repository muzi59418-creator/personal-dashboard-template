import { useEffect, useState } from "react";
import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FolderKanban,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  QrCode,
  Settings,
  X,
} from "lucide-react";
import { APP_VERSION } from "../../data/appVersion";

export type ViewKey = "dashboard" | "diary" | "work" | "ideas" | "projects" | "categories" | "settings";

export interface SidebarSocialProfile {
  platformLabel: string;
  accountId: string;
  profileUrl: string;
  qrImage: string;
}

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
  accountName?: string;
  onSignOut?: () => Promise<void>;
  socialProfile?: SidebarSocialProfile;
}

export function Sidebar({ activeView, collapsed, mobileOpen, onNavigate, onToggleCollapsed, onClose, accountName, onSignOut, socialProfile }: SidebarProps) {
  const now = useLiveTime();
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    if (!qrOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setQrOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [qrOpen]);

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
        {accountName && (
          <div className="sidebar-account" aria-label={`当前登录账号：${accountName}`} title={accountName}>
            <span className="sidebar-account-avatar" aria-hidden="true">{getAccountInitial(accountName)}</span>
            <span className="sidebar-account-name">{accountName}</span>
          </div>
        )}
        {accountName && socialProfile && (
          <div className="sidebar-social" aria-label={`${socialProfile.platformLabel}账号`}>
            <a className="sidebar-social-link" href={socialProfile.profileUrl} target="_blank" rel="noopener noreferrer" aria-label={`打开${socialProfile.platformLabel}主页`}>
              <span className="sidebar-social-copy">
                <span className="sidebar-social-platform">{socialProfile.platformLabel}号</span>
                <strong>{socialProfile.accountId}</strong>
              </span>
              <ExternalLink size={14} aria-hidden="true" />
            </a>
            <button className="sidebar-social-qr" type="button" aria-label={`查看${socialProfile.platformLabel}二维码`} title={`查看${socialProfile.platformLabel}二维码`} onClick={() => setQrOpen(true)}>
              <QrCode size={17} aria-hidden="true" />
            </button>
          </div>
        )}
        {onSignOut && (
          <button className="nav-button sidebar-sign-out" type="button" title={collapsed ? "退出登录" : undefined} onClick={() => void onSignOut()}>
            <LogOut size={18} />
            <span>退出登录</span>
          </button>
        )}
        <div className="sidebar-clock" aria-label="当前时间">
          <strong>{formatClockTime(now)}</strong>
          <span>{formatClockDate(now)}</span>
          <small>v{APP_VERSION}</small>
        </div>
      </aside>
      {mobileOpen && <button className="sidebar-scrim" type="button" aria-label="关闭菜单遮罩" onClick={onClose} />}
      {qrOpen && socialProfile && (
        <div className="sidebar-qr-overlay">
          <button className="sidebar-qr-backdrop" type="button" aria-label="关闭二维码" onClick={() => setQrOpen(false)} />
          <section className="sidebar-qr-dialog" role="dialog" aria-modal="true" aria-label={`${socialProfile.platformLabel}二维码`}>
            <div className="sidebar-qr-dialog-head">
              <strong>{socialProfile.platformLabel}二维码</strong>
              <button className="icon-button" type="button" aria-label="关闭二维码" title="关闭二维码" onClick={() => setQrOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <img src={socialProfile.qrImage} alt={`${socialProfile.platformLabel}二维码`} />
          </section>
        </div>
      )}
    </>
  );
}

function getAccountInitial(accountName: string): string {
  return Array.from(accountName.trim())[0]?.toLocaleUpperCase("zh-CN") || "账";
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
