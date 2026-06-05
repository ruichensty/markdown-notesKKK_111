import type { Note } from "@types";
import { exportAsMarkdown, exportAsHTML, exportAsText, exportAsPDF } from "@utils/export";
import { useTheme } from "@context";
import { useClickOutside } from "@hooks/useClickOutside";

type ViewMode = "home" | "editor" | "preview" | "split";

interface ToolbarProps {
  currentNote: Note | null;
  onNewNote: () => void;
  showExportMenu: boolean;
  onToggleExportMenu: () => void;
  onToggleSidebar: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onToggleSettings: () => void;
  onGoHome: () => void;
  focusMode: boolean;
  typewriterMode: boolean;
  onToggleFocusMode: () => void;
  onToggleTypewriterMode: () => void;
  isMobile?: boolean;
}

export function Toolbar({
  currentNote,
  onNewNote,
  showExportMenu,
  onToggleExportMenu,
  onToggleSidebar,
  viewMode,
  onViewModeChange,
  onToggleSettings,
  onGoHome,
  focusMode,
  typewriterMode,
  onToggleFocusMode,
  onToggleTypewriterMode,
  isMobile = false,
}: ToolbarProps) {
  const { theme, toggleTheme } = useTheme();
  const exportMenuRef = useClickOutside<HTMLDivElement>(() => {
    if (showExportMenu) onToggleExportMenu();
  });

  const handleExport = (format: "markdown" | "html" | "text" | "pdf") => {
    if (!currentNote && format !== "pdf") return;

    switch (format) {
      case "markdown":
        exportAsMarkdown(currentNote!);
        break;
      case "html":
        exportAsHTML(currentNote!);
        break;
      case "text":
        exportAsText(currentNote!);
        break;
      case "pdf":
        exportAsPDF();
        break;
    }

    onToggleExportMenu();
  };

  return (
    <div className="app-toolbar sticky top-0 z-[9999] flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <button onClick={onToggleSidebar} className="toolbar-icon-btn" title="Toggle Sidebar">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <h1
          onClick={onGoHome}
          className="toolbar-title text-foreground cursor-pointer hover:text-primary transition-colors"
        >
          {currentNote ? currentNote.title || "Untitled" : "Workspace"}
        </h1>
      </div>

      <div className="flex items-center gap-1">
        {!isMobile && (
          <div className="toolbar-segment">
            <button
              onClick={() => onViewModeChange("home")}
              className={`toolbar-segment-btn ${
                viewMode === "home" ? "toolbar-segment-btn--active" : ""
              }`}
              title="Home"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 7.5L8 2l6 5.5V13a1.5 1.5 0 01-1.5 1.5h-3V10h-3v4.5h-3A1.5 1.5 0 012 13z" />
              </svg>
            </button>
            <button
              onClick={() => onViewModeChange("editor")}
              className={`toolbar-segment-btn ${
                viewMode === "editor" ? "toolbar-segment-btn--active" : ""
              }`}
              title="Editor Only"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="12" height="12" rx="1.5" />
                <line x1="5" y1="5" x2="8" y2="5" />
                <line x1="5" y1="7.5" x2="11" y2="7.5" />
                <line x1="5" y1="10" x2="9" y2="10" />
                <line x1="10" y1="5" x2="11" y2="5" />
              </svg>
            </button>
            <button
              onClick={() => onViewModeChange("split")}
              className={`toolbar-segment-btn ${
                viewMode === "split" ? "toolbar-segment-btn--active" : ""
              }`}
              title="Split View"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="12" height="12" rx="1.5" />
                <line x1="8" y1="3" x2="8" y2="13" strokeDasharray="1.5 1" />
                <line x1="4" y1="5.5" x2="6.5" y2="5.5" />
                <line x1="4" y1="7.5" x2="6" y2="7.5" />
                <line x1="9.5" y1="5.5" x2="12" y2="5.5" />
                <line x1="9.5" y1="7.5" x2="11.5" y2="7.5" />
              </svg>
            </button>
            <button
              onClick={() => onViewModeChange("preview")}
              className={`toolbar-segment-btn ${
                viewMode === "preview" ? "toolbar-segment-btn--active" : ""
              }`}
              title="Preview Only"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="12" height="12" rx="1.5" />
                <line x1="5" y1="5.5" x2="11" y2="5.5" />
                <line x1="5" y1="7.5" x2="11" y2="7.5" />
                <line x1="5" y1="9.5" x2="8" y2="9.5" />
                <polyline points="9,9.5 10,10.5 12,8.5" />
              </svg>
            </button>
          </div>
        )}

        {isMobile && currentNote && (
          <button
            onClick={() => onViewModeChange(viewMode === "preview" ? "editor" : "preview")}
            className="toolbar-icon-btn"
            title={viewMode === "preview" ? "编辑" : "预览"}
          >
            {viewMode === "preview" ? (
              <svg
                className="w-4 h-4"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="12" height="12" rx="1.5" />
                <line x1="5" y1="5" x2="8" y2="5" />
                <line x1="5" y1="7.5" x2="11" y2="7.5" />
                <line x1="5" y1="10" x2="9" y2="10" />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="12" height="12" rx="1.5" />
                <line x1="5" y1="5.5" x2="11" y2="5.5" />
                <line x1="5" y1="7.5" x2="11" y2="7.5" />
                <line x1="5" y1="9.5" x2="8" y2="9.5" />
                <polyline points="9,9.5 10,10.5 12,8.5" />
              </svg>
            )}
          </button>
        )}

        {!isMobile && (
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleFocusMode}
              className={`toolbar-icon-btn ${focusMode ? "bg-primary/10 text-primary" : ""}`}
              title="焦点模式 (F8)"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="8" cy="8" r="3" />
                <line x1="8" y1="1" x2="8" y2="4" />
                <line x1="8" y1="12" x2="8" y2="15" />
                <line x1="1" y1="8" x2="4" y2="8" />
                <line x1="12" y1="8" x2="15" y2="8" />
              </svg>
            </button>
            <button
              onClick={onToggleTypewriterMode}
              className={`toolbar-icon-btn ${typewriterMode ? "bg-primary/10 text-primary" : ""}`}
              title="打字机模式 (F9)"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="12" height="8" rx="1.5" />
                <line x1="5" y1="7" x2="11" y2="7" />
                <line x1="7" y1="10" x2="9" y2="10" />
              </svg>
            </button>
          </div>
        )}

        <div className="w-px h-5 bg-border"></div>

        <button onClick={onNewNote} className="toolbar-primary-btn" title="New Note (Ctrl+N)">
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2.5" y="1.5" width="11" height="13" rx="1.5" />
            <line x1="5" y1="4.5" x2="11" y2="4.5" />
            <line x1="5" y1="7" x2="11" y2="7" />
            <line x1="5" y1="9.5" x2="8" y2="9.5" />
            <line x1="11.5" y1="11" x2="11.5" y2="14.5" />
            <line x1="9.5" y1="12.5" x2="13.5" y2="12.5" />
          </svg>
          <span>新建笔记</span>
        </button>

        <div className="w-px h-5 bg-border"></div>

        <button onClick={toggleTheme} className="toolbar-icon-btn" title="Toggle Theme">
          {theme === "light" ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1m-16 0H3m3.222-5.778l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M18.364 5.636l-.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"
              />
            </svg>
          )}
        </button>

        <button onClick={onToggleSettings} className="toolbar-icon-btn" title="Settings">
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>

        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={onToggleExportMenu}
            disabled={!currentNote}
            className="toolbar-icon-btn disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 10v2.5A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5V10" />
              <polyline points="5,6 8,3 11,6" />
              <line x1="8" y1="3" x2="8" y2="10.5" />
            </svg>
          </button>

          {showExportMenu && currentNote && (
            <div className="absolute right-0 mt-1.5 w-48 bg-card border border-border rounded-lg shadow-2xl z-[50002] animate-fade-in">
              <div className="py-2 max-h-80 overflow-y-auto">
                <button
                  onClick={() => handleExport("markdown")}
                  className="w-full px-4 py-2.5 text-left hover:bg-muted/80 transition-colors text-sm font-medium rounded-lg"
                >
                  Export as Markdown
                </button>
                <button
                  onClick={() => handleExport("html")}
                  className="w-full px-4 py-2.5 text-left hover:bg-muted/80 transition-colors text-sm font-medium rounded-lg"
                >
                  Export as HTML
                </button>
                <button
                  onClick={() => handleExport("text")}
                  className="w-full px-4 py-2.5 text-left hover:bg-muted/80 transition-colors text-sm font-medium rounded-lg"
                >
                  Export as Text
                </button>
                <div className="my-1 border-t border-border" />
                <button
                  onClick={() => handleExport("pdf")}
                  className="w-full px-4 py-2.5 text-left hover:bg-muted/80 transition-colors text-sm font-medium rounded-lg"
                >
                  Export as PDF (Print)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
