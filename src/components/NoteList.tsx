import { useState, useMemo, useCallback, memo } from "react";
import { OutlineView } from "./OutlineView";
import { SortableNoteList } from "./SortableNoteList";
import { SearchResults } from "./SearchResults";
import { SidebarTabs } from "./SidebarTabs";
import type { SidebarTab } from "./SidebarTabs";
import { FolderTree } from "./FolderTree";
import { useFolders, useOutline } from "@hooks";
import type { Note } from "@types";

interface NoteListProps {
  notes: Note[];
  activeNoteId: string | null;
  onNoteSelect: (id: string) => void;
  onNewNote: (folderIds?: string[]) => void;
  onNoteDelete: (id: string) => void;
  onRemoveFolderFromNotes?: (folderIds: string[]) => void;
  onReorderNotes?: (activeId: string, overId: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  getFormattedDate?: (id: string) => string;
  sidebarWidth?: number;
  collapsed?: boolean;
  currentNoteContent?: string;
  onJumpToLine?: (line: number) => void;
}

function sortNotesByTitle(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    const ta = (a.title || "Untitled").toLowerCase();
    const tb = (b.title || "Untitled").toLowerCase();
    if (ta !== tb) return ta.localeCompare(tb);
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

function EmptyNotes() {
  return (
    <div className="sidebar-empty">
      <svg
        className="w-8 h-8 text-muted-foreground/20 mb-2"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-[10px] text-muted-foreground/50">暂无笔记</p>
      <p className="text-[9px] text-muted-foreground/30 mt-0.5">点击上方按钮创建</p>
    </div>
  );
}

function NoteList({
  notes,
  activeNoteId,
  onNoteSelect,
  onNewNote,
  onNoteDelete,
  onRemoveFolderFromNotes,
  onReorderNotes,
  searchInputRef,
  sidebarWidth = 280,
  collapsed = false,
  currentNoteContent,
  onJumpToLine,
}: NoteListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SidebarTab>("notes");

  const { folderTree, folders, createFolder, deleteFolder, updateFolder } = useFolders();
  const headings = useOutline(currentNoteContent || "");

  const rootNotes = useMemo(() => {
    return sortNotesByTitle(
      notes.filter(note => !Array.isArray(note.folderIds) || note.folderIds.length === 0)
    );
  }, [notes]);

  const searchResults = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase();
    if (!normalizedQuery) return [];

    return sortNotesByTitle(
      notes.filter(
        note =>
          note.title.toLowerCase().includes(normalizedQuery) ||
          note.content.toLowerCase().includes(normalizedQuery)
      )
    );
  }, [notes, searchQuery]);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  const handleCreateFolder = useCallback(
    (parentId: string | null) => {
      createFolder({ name: "New Folder", parentId, createdAt: Date.now() });
    },
    [createFolder]
  );

  const handleRenameFolder = useCallback(
    (id: string, name: string) => {
      updateFolder(id, { name });
    },
    [updateFolder]
  );

  const handleDeleteFolder = useCallback(
    (id: string) => {
      const idsToDelete = new Set<string>();
      const collectIds = (folderId: string) => {
        idsToDelete.add(folderId);
        for (const folder of folders) {
          if (folder.parentId === folderId) collectIds(folder.id);
        }
      };

      collectIds(id);
      deleteFolder(id);
      onRemoveFolderFromNotes?.(Array.from(idsToDelete));
    },
    [folders, deleteFolder, onRemoveFolderFromNotes]
  );

  const handleJumpToLine = useCallback(
    (line: number) => {
      onJumpToLine?.(line);
    },
    [onJumpToLine]
  );

  return (
    <div
      className={`sidebar-root ${collapsed ? "sidebar-root--collapsed" : ""}`}
      style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}
    >
      <div className="sidebar-header">
        <div className="sidebar-brand-mark">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4}>
            <path d="M4.5 1.5h4.672a1 1 0 01.707.293l3.328 3.328a1 1 0 01.293.707V13a1.5 1.5 0 01-1.5 1.5h-7.5A1.5 1.5 0 013 13V3a1.5 1.5 0 011.5-1.5z" />
            <path d="M9 1.5V6h4.5" />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="sidebar-brand-title">Markdown Notes</div>
          <div className="sidebar-brand-subtitle">{notes.length} notes stored</div>
        </div>
      </div>

      <div className="sidebar-search">
        <svg
          className="sidebar-search-icon"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="7" cy="7" r="4.5" />
          <line x1="10.2" y1="10.2" x2="13.5" y2="13.5" />
        </svg>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="搜索笔记..."
          className="sidebar-search-input"
        />
      </div>

      <div className="sidebar-actions">
        <button
          onClick={() => onNewNote()}
          className="sidebar-action-btn sidebar-action-btn--primary"
        >
          <svg
            className="w-3 h-3"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3v10M13 8H3" />
          </svg>
          <span>笔记</span>
        </button>
        <button
          onClick={() => handleCreateFolder(null)}
          className="sidebar-action-btn sidebar-action-btn--secondary"
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
            <path d="M2 5.5A1.5 1.5 0 013.5 4h2.672a.5.5 0 01.353.146L8.06 5.68a.5.5 0 00.353.147H12.5A1.5 1.5 0 0114 7.33v4.17a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5z" />
          </svg>
          <span>文件夹</span>
        </button>
      </div>

      <SidebarTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="sidebar-content scrollbar-thin">
        {activeTab === "outline" ? (
          <OutlineView headings={headings} currentLine={0} onJumpToLine={handleJumpToLine} />
        ) : searchQuery ? (
          <SearchResults
            notes={searchResults}
            activeNoteId={activeNoteId}
            onNoteSelect={onNoteSelect}
            onNoteDelete={onNoteDelete}
          />
        ) : (
          <>
            <SortableNoteList
              notes={rootNotes}
              activeNoteId={activeNoteId}
              onNoteSelect={onNoteSelect}
              onNoteDelete={onNoteDelete}
              onReorderNotes={onReorderNotes}
            />
            <FolderTree
              folders={folderTree}
              notes={notes}
              activeNoteId={activeNoteId}
              onNoteSelect={onNoteSelect}
              onNoteDelete={onNoteDelete}
              onNewNote={onNewNote}
              onCreateFolder={handleCreateFolder}
              onDeleteFolder={handleDeleteFolder}
              onRenameFolder={handleRenameFolder}
            />
            {notes.length === 0 && <EmptyNotes />}
          </>
        )}
      </div>

      <div className="sidebar-footer">
        <span>Auto-save</span>
        <span className="sidebar-footer-dot" />
        <span>IndexedDB</span>
      </div>
    </div>
  );
}

export default memo(NoteList, (prevProps, nextProps) => {
  return (
    prevProps.notes === nextProps.notes &&
    prevProps.activeNoteId === nextProps.activeNoteId &&
    prevProps.getFormattedDate === nextProps.getFormattedDate &&
    prevProps.onNoteSelect === nextProps.onNoteSelect &&
    prevProps.onNewNote === nextProps.onNewNote &&
    prevProps.onNoteDelete === nextProps.onNoteDelete &&
    prevProps.searchInputRef === nextProps.searchInputRef &&
    prevProps.currentNoteContent === nextProps.currentNoteContent
  );
});
