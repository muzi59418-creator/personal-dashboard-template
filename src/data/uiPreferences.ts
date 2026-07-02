export const SIDEBAR_COLLAPSED_KEY = "personal-dashboard-template:sidebar-collapsed";

export function readSidebarCollapsed(): boolean {
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

export function writeSidebarCollapsed(collapsed: boolean): void {
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
}
