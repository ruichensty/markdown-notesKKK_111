export type SidebarTab = "notes" | "outline";

interface SidebarTabsProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}

export function SidebarTabs({ activeTab, onTabChange }: SidebarTabsProps) {
  return (
    <div className="sidebar-tab-bar">
      <button
        onClick={() => onTabChange("notes")}
        className={`sidebar-tab ${activeTab === "notes" ? "sidebar-tab--active" : ""}`}
      >
        <svg
          className="w-3 h-3"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4.5 1.5h4.672a1 1 0 01.707.293l3.328 3.328a1 1 0 01.293.707V13a1.5 1.5 0 01-1.5 1.5h-7.5A1.5 1.5 0 013 13V3a1.5 1.5 0 011.5-1.5z" />
        </svg>
        <span>笔记</span>
      </button>
      <button
        onClick={() => onTabChange("outline")}
        className={`sidebar-tab ${activeTab === "outline" ? "sidebar-tab--active" : ""}`}
      >
        <svg
          className="w-3 h-3"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6h8M4 10h6M4 3h8M4 13h4" />
        </svg>
        <span>大纲</span>
      </button>
    </div>
  );
}
