import { useState, useRef, useMemo, useEffect, useCallback, memo } from "react";
import type { Note } from "@types";
import { FolderNode } from "./FolderNode";
import { FolderTreeContext, type FolderTreeContextValue } from "./folderTreeContext";
import { isFolderInSubtree, type FolderNodeData } from "@utils/folderTree";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent, DragOverEvent } from "@dnd-kit/core";

const HOVER_EXPAND_DELAY = 500;
const EMPTY_NOTES: Note[] = [];

interface FolderTreeProps {
  folders: FolderNodeData[];
  notes: Note[];
  activeNoteId: string | null;
  onNoteSelect: (id: string) => void;
  onNoteDelete: (id: string) => void;
  onNewNote: (folderIds?: string[]) => void;
  onCreateFolder: (parentId: string | null) => void;
  onDeleteFolder: (id: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onMoveNoteToFolder?: (noteId: string, folderId: string) => void;
  onMoveNoteToRoot?: (noteId: string) => void;
  onReorderFolder?: (folderId: string, newParentId: string | null, newIndex?: number) => void;
  onCopyNote?: (noteId: string) => void;
  onReorderNotesInFolder?: (folderId: string, activeId: string, overId: string) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  allFolders?: FolderNodeData[];
  expandedFolders: string[];
  onExpandedFoldersChange: (ids: string[]) => void;
  pendingRenameId?: string | null;
  onClearPendingRename?: () => void;
}

function FolderTreeBase(props: FolderTreeProps) {
  const {
    folders,
    notes,
    activeNoteId,
    expandedFolders,
    onExpandedFoldersChange,
    onReorderNotesInFolder,
    onNoteSelect,
    pendingRenameId,
    onMoveNoteToFolder,
    onMoveNoteToRoot,
    onReorderFolder,
  } = props;

  const [dragState, setDragState] = useState<{
    activeId: string;
    type: "note" | "folder";
    item: Note | FolderNodeData;
  } | null>(null);
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const focusablesRef = useRef<Map<string, HTMLElement>>(new Map());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const expandedSet = useMemo(() => new Set(expandedFolders), [expandedFolders]);

  const { notesByFolder, activeAncestorSet } = useMemo(() => {
    const byFolder = new Map<string, Note[]>();
    for (const note of notes) {
      if (Array.isArray(note.folderIds)) {
        for (const fid of note.folderIds) {
          const list = byFolder.get(fid);
          if (list) list.push(note);
          else byFolder.set(fid, [note]);
        }
      }
    }

    const ancestors = new Set<string>();
    const folderById = new Map<string, FolderNodeData>();
    const indexFolders = (list: FolderNodeData[]) => {
      for (const f of list) {
        folderById.set(f.id, f);
        if (f.children?.length) indexFolders(f.children);
      }
    };
    indexFolders(folders);

    if (activeNoteId) {
      const activeNote = notes.find(n => n.id === activeNoteId);
      if (activeNote?.folderIds) {
        const climb = (fid: string) => {
          ancestors.add(fid);
          let cur = folderById.get(fid)?.parentId ?? null;
          while (cur) {
            ancestors.add(cur);
            cur = folderById.get(cur)?.parentId ?? null;
          }
        };
        activeNote.folderIds.forEach(climb);
      }
    }

    return { notesByFolder: byFolder, activeAncestorSet: ancestors };
  }, [notes, activeNoteId, folders]);

  useEffect(() => {
    if (activeAncestorSet.size === 0) return;
    const missing = [...activeAncestorSet].filter(id => !expandedSet.has(id));
    if (missing.length === 0) return;
    onExpandedFoldersChange([...expandedSet, ...missing]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAncestorSet]);

  const handleToggleExpand = useCallback(
    (id: string, force?: boolean) => {
      const next = new Set(expandedSet);
      if (force === true) next.add(id);
      else if (force === false) next.delete(id);
      else if (next.has(id)) next.delete(id);
      else next.add(id);
      onExpandedFoldersChange([...next]);
    },
    [expandedSet, onExpandedFoldersChange]
  );

  const registerFocusable = useCallback((id: string, el: HTMLElement | null) => {
    if (el) focusablesRef.current.set(id, el);
    else focusablesRef.current.delete(id);
  }, []);

  const folderByIdMap = useMemo(() => {
    const map = new Map<string, FolderNodeData>();
    const walk = (list: FolderNodeData[]) => {
      for (const f of list) {
        map.set(f.id, f);
        if (f.children?.length) walk(f.children);
      }
    };
    walk(folders);
    return map;
  }, [folders]);

  const visibleFocusables = useMemo(() => {
    const order: string[] = [];
    const walk = (list: FolderNodeData[]) => {
      for (const f of list) {
        order.push(`folder:${f.id}`);
        if (expandedSet.has(f.id)) {
          if (f.children?.length) walk(f.children);
          const fNotes = notesByFolder.get(f.id) || [];
          fNotes.forEach(n => order.push(`note:${n.id}`));
        }
      }
    };
    walk(folders);
    return order;
  }, [folders, expandedSet, notesByFolder]);

  const focusItem = useCallback((id: string) => {
    setFocusedId(id);
    requestAnimationFrame(() => {
      focusablesRef.current.get(id)?.focus();
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (focusedId === null) return;
      const idx = visibleFocusables.indexOf(focusedId);
      if (idx === -1) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = visibleFocusables[idx + 1];
        if (next) focusItem(next);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = visibleFocusables[idx - 1];
        if (prev) focusItem(prev);
      } else if (e.key === "ArrowRight") {
        if (focusedId.startsWith("folder:")) {
          const fid = focusedId.slice("folder:".length);
          if (!expandedSet.has(fid)) {
            e.preventDefault();
            handleToggleExpand(fid, true);
          }
        }
      } else if (e.key === "ArrowLeft") {
        if (focusedId.startsWith("folder:")) {
          const fid = focusedId.slice("folder:".length);
          if (expandedSet.has(fid)) {
            e.preventDefault();
            handleToggleExpand(fid, false);
          } else {
            const cur = folderByIdMap.get(fid);
            if (cur?.parentId) {
              e.preventDefault();
              focusItem(`folder:${cur.parentId}`);
            }
          }
        }
      } else if (e.key === "Enter") {
        if (focusedId.startsWith("note:")) {
          e.preventDefault();
          onNoteSelect(focusedId.slice("note:".length));
        }
      }
    },
    [
      focusedId,
      visibleFocusables,
      focusItem,
      expandedSet,
      handleToggleExpand,
      folderByIdMap,
      onNoteSelect,
    ]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const id = String(active.id);
    const data = active.data.current;
    if (!data) return;
    if (data.type === "note") {
      setDragState({ activeId: id, type: "note", item: data.note });
    } else if (data.type === "folder") {
      setDragState({ activeId: id, type: "folder", item: data.folder });
    }
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over) return;
      const overId = String(over.id);

      if (overId.startsWith("folder-drop-")) {
        const folderId = overId.replace("folder-drop-", "");
        if (hoveredFolderId !== folderId) {
          setHoveredFolderId(folderId);
          if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
          if (!expandedSet.has(folderId)) {
            hoverTimerRef.current = setTimeout(() => {
              handleToggleExpand(folderId, true);
            }, HOVER_EXPAND_DELAY);
          }
        }
      } else {
        setHoveredFolderId(null);
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      }
    },
    [hoveredFolderId, expandedSet, handleToggleExpand]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setDragState(null);
      setHoveredFolderId(null);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);

      if (!over) return;
      const overId = String(over.id);
      const activeData = active.data.current;
      if (!activeData) return;

      if (activeData.type === "note") {
        const note = activeData.note as Note;
        if (overId.startsWith("folder-drop-")) {
          const targetFolderId = overId.replace("folder-drop-", "");
          onMoveNoteToFolder?.(note.id, targetFolderId);
        } else if (overId === "root-droppable") {
          onMoveNoteToRoot?.(note.id);
        }
      } else if (activeData.type === "folder") {
        const folder = activeData.folder as FolderNodeData;
        if (overId.startsWith("folder-drop-")) {
          const targetFolderId = overId.replace("folder-drop-", "");
          if (folder.id !== targetFolderId && !isFolderInSubtree(targetFolderId, folder)) {
            onReorderFolder?.(folder.id, targetFolderId);
          }
        } else if (overId === "root-droppable") {
          onReorderFolder?.(folder.id, null);
        }
      }
    },
    [onMoveNoteToFolder, onMoveNoteToRoot, onReorderFolder]
  );

  const contextValue = useMemo<FolderTreeContextValue>(
    () => ({
      notesByFolder,
      activeAncestorSet,
      expandedSet,
      onToggleExpand: handleToggleExpand,
      activeNoteId,
      onNoteSelect,
      onNoteDelete: props.onNoteDelete,
      onNewNote: props.onNewNote,
      onCreateFolder: props.onCreateFolder,
      onDeleteFolder: props.onDeleteFolder,
      onRenameFolder: props.onRenameFolder,
      onMoveNoteToFolder: props.onMoveNoteToFolder,
      onMoveNoteToRoot: props.onMoveNoteToRoot,
      onReorderFolder: props.onReorderFolder,
      onCopyNote: props.onCopyNote,
      onReorderNotesInFolder,
      selectionMode: props.selectionMode,
      selectedIds: props.selectedIds,
      onToggleSelect: props.onToggleSelect,
      allFolders: props.allFolders,
      focusedId,
      registerFocusable,
      pendingRenameId,
      clearPendingRename: props.onClearPendingRename ?? (() => {}),
    }),
    [
      notesByFolder,
      activeAncestorSet,
      expandedSet,
      handleToggleExpand,
      activeNoteId,
      onNoteSelect,
      onReorderNotesInFolder,
      focusedId,
      registerFocusable,
      pendingRenameId,
      props.onNoteDelete,
      props.onNewNote,
      props.onCreateFolder,
      props.onDeleteFolder,
      props.onRenameFolder,
      props.onMoveNoteToFolder,
      props.onMoveNoteToRoot,
      props.onReorderFolder,
      props.onCopyNote,
      props.selectionMode,
      props.selectedIds,
      props.onToggleSelect,
      props.allFolders,
      props.onClearPendingRename,
    ]
  );

  return (
    <div
      className="sidebar-folder-tree-root"
      data-dnd-context="true"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <FolderTreeContext.Provider value={contextValue}>
          {folders.map(folder => (
            <FolderNode
              key={folder.id}
              folder={folder}
              folderNotes={notesByFolder.get(folder.id) ?? EMPTY_NOTES}
              hasActiveDescendant={activeAncestorSet.has(folder.id)}
              expanded={expandedSet.has(folder.id)}
              level={0}
            />
          ))}
        </FolderTreeContext.Provider>
        {dragState && (
          <DragOverlay dropAnimation={null}>
            <div className="drag-overlay-item">
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {dragState.type === "folder" ? (
                  <path d="M2 5.5A1.5 1.5 0 013.5 4h2.672a.5.5 0 01.353.146L8.06 5.68a.5.5 0 00.353.147H12.5A1.5 1.5 0 0114 7.33v4.17a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5z" />
                ) : (
                  <>
                    <path d="M4.5 1.5h4.672a1 1 0 01.707.293l3.328 3.328a1 1 0 01.293.707V13a1.5 1.5 0 01-1.5 1.5h-7.5A1.5 1.5 0 013 13V3a1.5 1.5 0 011.5-1.5z" />
                    <polyline points="9,1.5 9,6 13.5,6" />
                  </>
                )}
              </svg>
              <span>
                {dragState.type === "folder"
                  ? (dragState.item as FolderNodeData).name
                  : (dragState.item as Note).title || "Untitled"}
              </span>
            </div>
          </DragOverlay>
        )}
      </DndContext>
    </div>
  );
}

export const FolderTree = memo(FolderTreeBase);
