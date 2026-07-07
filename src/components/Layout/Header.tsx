import { Menu } from "lucide-react";

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-title">
        <button className="icon-button mobile-menu-button" type="button" aria-label="打开菜单" title="打开菜单" onClick={onMenuToggle}>
          <Menu size={19} />
        </button>
        <h1>个人工作仪表板</h1>
      </div>
    </header>
  );
}
