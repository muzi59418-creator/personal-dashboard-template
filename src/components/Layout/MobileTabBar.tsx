import { BookOpenText, FolderKanban, Home, Lightbulb, Settings } from "lucide-react";
import type { ViewKey } from "./Sidebar";

const tabs: Array<{ key: ViewKey; label: string; icon: typeof Home }> = [
  { key: "dashboard", label: "仪表盘", icon: Home },
  { key: "diary", label: "日记", icon: BookOpenText },
  { key: "ideas", label: "记录", icon: Lightbulb },
  { key: "projects", label: "项目", icon: FolderKanban },
  { key: "settings", label: "设置", icon: Settings },
];

interface MobileTabBarProps {
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
}

export function MobileTabBar({ activeView, onNavigate }: MobileTabBarProps) {
  return (
    <nav className="mobile-tabbar" aria-label="移动端底部导航">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            className={activeView === tab.key ? "active" : ""}
            type="button"
            onClick={() => onNavigate(tab.key)}
          >
            <Icon size={18} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
