import { useState, useMemo, useCallback, useEffect, memo } from "react";
import { OutlineView } from "./OutlineView";
import { SortableNoteList } from "./SortableNoteList";
import { SearchResults } from "./SearchResults";
import { NoteSearchResults } from "./NoteSearchResults";
import { SidebarTabs } from "./SidebarTabs";
import type { SidebarTab } from "./SidebarTabs";
import { FolderTree } from "./FolderTree";
import { EmptyStateIllustration } from "./EmptyStateIllustration";
import { useOutline, useDebounce } from "@hooks";
import { flattenFolderTree, collectFolderSubtreeIds, type FolderNodeData } from "@utils/folderTree";
import { sortNotes } from "@utils/export";
import { searchNotes, type NoteSearchDateRange, type NoteSearchScope } from "@utils/noteSearch";
import type { Note, Folder } from "@types";
import { useContextMenu, type ContextMenuItem } from "@context/ContextMenuContext";

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
  onJumpToLine?: (line: number) => void;
  isMobile?: boolean;
  onBatchDelete?: (ids: string[]) => void;
  onBatchMoveToFolder?: (ids: string[], folderId: string) => void;
  onMoveNoteToFolder?: (noteId: string, folderId: string) => void;
  onMoveNoteToRoot?: (noteId: string) => void;
  onCopyNote?: (noteId: string) => void;
  onReorderFolder?: (folderId: string, newParentId: string | null) => void;
  trashCount?: number;
  onOpenTrash?: () => void;
  selectedFolderId?: string | null;
  onClearFolderSelection?: () => void;
  expandedFolders?: string[];
  onExpandedFoldersChange?: (ids: string[]) => void;
  onReorderNotesInFolder?: (folderId: string, activeId: string, overId: string) => void;
  folderTree: FolderNodeData[];
  folders: Folder[];
  createFolder: (data: Omit<Folder, "id">) => string;
  deleteFolder: (id: string) => void;
  updateFolder: (id: string, data: Partial<Folder>) => void;
}

function EmptyNotes() {
  return (
    <div className="sidebar-empty">
      <EmptyStateIllustration />
      <p className="text-[10px] text-muted-foreground/40 mt-2">暂无笔记</p>
      <p className="text-[9px] text-muted-foreground/25 mt-0.5">点击上方按钮创建</p>
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
  onJumpToLine,
  onBatchDelete,
  onMoveNoteToFolder,
  onMoveNoteToRoot,
  onCopyNote,
  onReorderFolder,
  trashCount = 0,
  onOpenTrash,
  selectedFolderId = null,
  onClearFolderSelection,
  expandedFolders = [],
  onExpandedFoldersChange,
  onReorderNotesInFolder,
  onBatchMoveToFolder,
  folderTree,
  folders,
  createFolder,
  deleteFolder,
  updateFolder,
}: NoteListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<NoteSearchScope>("all");
  const [searchDateRange, setSearchDateRange] = useState<NoteSearchDateRange>("all");
  const [activeTab, setActiveTab] = useState<SidebarTab>("notes");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingRenameId, setPendingRenameId] = useState<string | null>(null);

  const { show: showContextMenu } = useContextMenu();
  const outlineContent = useMemo(
    () => notes.find(n => n.id === activeNoteId)?.content ?? "",
    [notes, activeNoteId]
  );
  const headings = useOutline(outlineContent);

  const debouncedSearchQuery = useDebounce(searchQuery, 200);
  const isSearchPending = searchQuery.trim() !== debouncedSearchQuery.trim();

  const rootNotes = useMemo(() => {
    return sortNotes(
      notes.filter(note => !Array.isArray(note.folderIds) || note.folderIds.length === 0)
    );
  }, [notes]);

  const searchResults = useMemo(() => {
    return searchNotes(notes, debouncedSearchQuery, {
      scope: searchScope,
      dateRange: searchDateRange,
    });
  }, [notes, debouncedSearchQuery, searchScope, searchDateRange]);

  const selectedFolder = useMemo(
    () => folders.find(folder => folder.id === selectedFolderId) ?? null,
    [folders, selectedFolderId]
  );

  const selectedFolderNotes = useMemo(() => {
    if (!selectedFolderId) return [];
    return sortNotes(notes.filter(note => note.folderIds?.includes(selectedFolderId)));
  }, [notes, selectedFolderId]);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  const handleCreateFolder = useCallback(
    (parentId: string | null) => {
      const id = createFolder({ name: "New Folder", parentId, createdAt: Date.now() });
      setPendingRenameId(id);
    },
    [createFolder]
  );

  const handleRenameFolder = useCallback(
    (id: string, name: string) => {
      updateFolder(id, { name });
      setPendingRenameId(null);
    },
    [updateFolder]
  );

  const handleDeleteFolder = useCallback(
    (id: string) => {
      const idsToDelete = collectFolderSubtreeIds(id, folders);
      deleteFolder(id);
      onRemoveFolderFromNotes?.(Array.from(idsToDelete));
    },
    [folders, deleteFolder, onRemoveFolderFromNotes]
  );

  const allFolderIds = useMemo(() => {
    const ids: string[] = [];
    const walk = (list: typeof folderTree) => {
      for (const f of list) {
        ids.push(f.id);
        if (f.children?.length) walk(f.children);
      }
    };
    walk(folderTree);
    return ids;
  }, [folderTree]);

  const handleExpandAll = useCallback(() => {
    onExpandedFoldersChange?.(allFolderIds);
  }, [allFolderIds, onExpandedFoldersChange]);

  const handleCollapseAll = useCallback(() => {
    onExpandedFoldersChange?.([]);
  }, [onExpandedFoldersChange]);

  const handleJumpToLine = useCallback(
    (line: number) => {
      onJumpToLine?.(line);
    },
    [onJumpToLine]
  );

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const visibleNoteIds = useMemo(() => {
    if (searchQuery) return isSearchPending ? [] : searchResults.map(result => result.note.id);
    if (selectedFolder) return selectedFolderNotes.map(n => n.id);
    return notes.map(n => n.id);
  }, [searchQuery, isSearchPending, selectedFolder, searchResults, selectedFolderNotes, notes]);

  const handleSelectAll = useCallback(() => {
    if (visibleNoteIds.length > 0 && visibleNoteIds.every(id => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleNoteIds));
    }
  }, [visibleNoteIds, selectedIds]);

  const handleExitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    if (!selectionMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleExitSelection();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectionMode, handleExitSelection]);

  const handleEnterSelection = useCallback(() => {
    setSelectionMode(true);
    setSelectedIds(new Set());
  }, []);

  const handleBatchDelete = useCallback(() => {
    if (selectedIds.size > 0 && onBatchDelete) {
      onBatchDelete(Array.from(selectedIds));
      handleExitSelection();
    }
  }, [selectedIds, onBatchDelete, handleExitSelection]);

  const handleBatchMoveRequest = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (selectedIds.size === 0 || !onBatchMoveToFolder) return;
      const items: ContextMenuItem[] = flattenFolderTree(folderTree).map(({ folder, depth }) => ({
        label: depth === 0 ? folder.name : `${"\u3000".repeat(depth)}\u203A ${folder.name}`,
        onClick: () => {
          onBatchMoveToFolder(Array.from(selectedIds), folder.id);
          handleExitSelection();
        },
      }));
      if (items.length === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      showContextMenu(rect.left, rect.bottom + 4, items);
    },
    [selectedIds, folderTree, onBatchMoveToFolder, handleExitSelection, showContextMenu]
  );

  const buildNoteContextMenu = useCallback(
    (note: Note): ContextMenuItem[] => {
      const moveTargets: ContextMenuItem[] = folderTree.map(f => ({
        label: f.name,
        onClick: () => onMoveNoteToFolder?.(note.id, f.id),
      }));
      const hasFolder = note.folderIds && note.folderIds.length > 0;
      if (hasFolder) {
        moveTargets.unshift({
          label: "根目录（无文件夹）",
          onClick: () => onMoveNoteToRoot?.(note.id),
        });
      }
      return [
        { label: "复制笔记", onClick: () => onCopyNote?.(note.id) },
        { separator: true, label: "" },
        {
          label: "移动到",
          children: moveTargets,
          disabled: moveTargets.length === 0,
        },
        { separator: true, label: "" },
        { label: "删除", danger: true, onClick: () => onNoteDelete(note.id) },
      ];
    },
    [folderTree, onMoveNoteToFolder, onMoveNoteToRoot, onCopyNote, onNoteDelete]
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

      <div className="sidebar-library-summary" aria-label="文件库概览">
        <div>
          <span className="sidebar-library-summary-label">Library</span>
          <strong>{notes.length}</strong>
          <small>screens saved</small>
        </div>
        <div>
          <span className="sidebar-library-summary-label">Collections</span>
          <strong>{folders.length}</strong>
          <small>folders</small>
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
      {searchQuery && (
        <div className="sidebar-search-filters" aria-label="搜索筛选">
          <select
            value={searchScope}
            onChange={event => setSearchScope(event.target.value as NoteSearchScope)}
            aria-label="搜索范围"
          >
            <option value="all">全部范围</option>
            <option value="title">仅标题</option>
            <option value="content">仅正文</option>
            <option value="tags">仅标签</option>
          </select>
          <select
            value={searchDateRange}
            onChange={event => setSearchDateRange(event.target.value as NoteSearchDateRange)}
            aria-label="修改时间范围"
          >
            <option value="all">全部时间</option>
            <option value="7d">近 7 天</option>
            <option value="30d">近 30 天</option>
          </select>
          <span>{isSearchPending ? "搜索中…" : `${searchResults.length} 条`}</span>
        </div>
      )}

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
        {!selectionMode && notes.length > 0 && (
          <button
            onClick={handleEnterSelection}
            className="sidebar-action-btn sidebar-action-btn--secondary"
            title="批量选择"
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
              <rect x="2" y="2" width="12" height="12" rx="1.5" />
              <path d="M5.5 8.5l2 2 4-4" />
            </svg>
            <span>多选</span>
          </button>
        )}
      </div>

      <SidebarTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "notes" && !searchQuery && !selectedFolder && folderTree.length > 0 && (
        <div className="sidebar-folder-toolbar">
          <span className="sidebar-folder-toolbar-label">文件夹</span>
          <div className="sidebar-folder-toolbar-actions">
            <button
              type="button"
              onClick={handleExpandAll}
              className="sidebar-folder-toolbar-btn"
              title="全部展开"
              aria-label="全部展开"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 8h8" />
                <path d="M8 4v8" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="sidebar-folder-toolbar-btn"
              title="全部折叠"
              aria-label="全部折叠"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 8h8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="sidebar-content scrollbar-thin">
        {activeTab === "outline" ? (
          <OutlineView headings={headings} currentLine={0} onJumpToLine={handleJumpToLine} />
        ) : searchQuery && isSearchPending ? (
          <div className="sidebar-search-pending" role="status">
            <span />
            正在搜索…
          </div>
        ) : searchQuery ? (
          <NoteSearchResults
            results={searchResults}
            query={debouncedSearchQuery}
            activeNoteId={activeNoteId}
            onNoteSelect={onNoteSelect}
            onNoteDelete={onNoteDelete}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onContextMenu={buildNoteContextMenu}
          />
        ) : selectedFolder ? (
          <>
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/60">
              <span className="min-w-0 truncate text-[11px] font-medium text-foreground">
                文件夹：{selectedFolder.name}
              </span>
              <button
                type="button"
                onClick={onClearFolderSelection}
                className="shrink-0 text-[10px] text-primary hover:underline"
              >
                显示全部
              </button>
            </div>
            <SearchResults
              notes={selectedFolderNotes}
              activeNoteId={activeNoteId}
              onNoteSelect={onNoteSelect}
              onNoteDelete={onNoteDelete}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onContextMenu={buildNoteContextMenu}
            />
          </>
        ) : (
          <>
            <SortableNoteList
              notes={rootNotes}
              activeNoteId={activeNoteId}
              onNoteSelect={onNoteSelect}
              onNoteDelete={onNoteDelete}
              onReorderNotes={onReorderNotes}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onContextMenu={buildNoteContextMenu}
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
              onMoveNoteToFolder={onMoveNoteToFolder}
              onMoveNoteToRoot={onMoveNoteToRoot}
              onReorderFolder={onReorderFolder}
              onCopyNote={onCopyNote}
              onReorderNotesInFolder={onReorderNotesInFolder}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              allFolders={folderTree}
              expandedFolders={expandedFolders}
              onExpandedFoldersChange={onExpandedFoldersChange ?? (() => {})}
              pendingRenameId={pendingRenameId}
              onClearPendingRename={() => setPendingRenameId(null)}
            />
            {notes.length === 0 && <EmptyNotes />}
          </>
        )}
      </div>

      {selectionMode && (
        <div className="batch-action-bar">
          <button onClick={handleSelectAll} className="batch-action-btn">
            <svg
              className="w-3 h-3"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="2" width="12" height="12" rx="1.5" />
              {visibleNoteIds.length > 0 && visibleNoteIds.every(id => selectedIds.has(id)) && (
                <path d="M5.5 8.5l2 2 4-4" />
              )}
            </svg>
            <span>全选</span>
          </button>
          <span className="batch-action-count">{selectedIds.size} 已选</span>
          <div className="batch-action-spacer" />
          {onBatchMoveToFolder && folderTree.length > 0 && (
            <button
              onClick={handleBatchMoveRequest}
              disabled={selectedIds.size === 0}
              className="batch-action-btn"
              title="移动到文件夹"
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
                <path d="M5 10h6M8 7.5v5" />
              </svg>
              <span>移动</span>
            </button>
          )}
          <button
            onClick={handleBatchDelete}
            disabled={selectedIds.size === 0}
            className="batch-action-btn batch-action-btn--danger"
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
              <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4m2 0v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4h9.34z" />
            </svg>
            <span>删除</span>
          </button>
          <button onClick={handleExitSelection} className="batch-action-btn">
            <span>取消</span>
            <span className="batch-action-hint">Esc</span>
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onOpenTrash}
        className="sidebar-footer"
        style={{ width: "100%", cursor: onOpenTrash ? "pointer" : "default" }}
        title="查看回收站"
      >
        <span className="flex items-center gap-1.5">
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.7}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
            />
          </svg>
          回收站
        </span>
        <span className="flex items-center gap-1.5">
          {trashCount > 0 && (
            <span
              className="inline-flex items-center justify-center min-w-[16px] h-[14px] px-1 rounded-full text-[9px] font-semibold"
              style={{
                backgroundColor: "hsl(var(--primary) / 0.15)",
                color: "hsl(var(--primary))",
              }}
            >
              {trashCount}
            </span>
          )}
          <span className="sidebar-footer-dot" />
          <span>IndexedDB</span>
        </span>
      </button>
    </div>
  );
}

function sameNotes(a: Note[], b: Note[], activeNoteId: string | null): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      (x.id !== activeNoteId && x.updatedAt !== y.updatedAt) ||
      x.title !== y.title ||
      x.order !== y.order ||
      x.deletedAt !== y.deletedAt
    ) {
      return false;
    }
  }
  return true;
}

export default memo(NoteList, (prevProps, nextProps) => {
  return (
    sameNotes(prevProps.notes, nextProps.notes, prevProps.activeNoteId) &&
    prevProps.activeNoteId === nextProps.activeNoteId &&
    prevProps.getFormattedDate === nextProps.getFormattedDate &&
    prevProps.onNoteSelect === nextProps.onNoteSelect &&
    prevProps.onNewNote === nextProps.onNewNote &&
    prevProps.onNoteDelete === nextProps.onNoteDelete &&
    prevProps.searchInputRef === nextProps.searchInputRef &&
    prevProps.onBatchDelete === nextProps.onBatchDelete &&
    prevProps.onBatchMoveToFolder === nextProps.onBatchMoveToFolder &&
    prevProps.onMoveNoteToFolder === nextProps.onMoveNoteToFolder &&
    prevProps.onMoveNoteToRoot === nextProps.onMoveNoteToRoot &&
    prevProps.onCopyNote === nextProps.onCopyNote &&
    prevProps.onReorderFolder === nextProps.onReorderFolder &&
    prevProps.trashCount === nextProps.trashCount &&
    prevProps.onOpenTrash === nextProps.onOpenTrash &&
    prevProps.onRemoveFolderFromNotes === nextProps.onRemoveFolderFromNotes &&
    prevProps.onReorderNotes === nextProps.onReorderNotes &&
    prevProps.onReorderNotesInFolder === nextProps.onReorderNotesInFolder &&
    prevProps.onExpandedFoldersChange === nextProps.onExpandedFoldersChange &&
    prevProps.onJumpToLine === nextProps.onJumpToLine &&
    prevProps.onClearFolderSelection === nextProps.onClearFolderSelection &&
    prevProps.sidebarWidth === nextProps.sidebarWidth &&
    prevProps.collapsed === nextProps.collapsed &&
    prevProps.selectedFolderId === nextProps.selectedFolderId &&
    prevProps.expandedFolders === nextProps.expandedFolders &&
    prevProps.folderTree === nextProps.folderTree &&
    prevProps.folders === nextProps.folders &&
    prevProps.createFolder === nextProps.createFolder &&
    prevProps.deleteFolder === nextProps.deleteFolder &&
    prevProps.updateFolder === nextProps.updateFolder &&
    prevProps.isMobile === nextProps.isMobile
  );
});
