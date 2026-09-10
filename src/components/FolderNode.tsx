import { useEffect, useState, useCallback, useRef, memo, useMemo } from "react";
import { NoteItem } from "./NoteItem";
import type { Folder, Note } from "@types";
import { sortNotes } from "@utils/export";
import { useContextMenu, type ContextMenuItem } from "@context/ContextMenuContext";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type FolderNodeData = Folder & { children?: FolderNodeData[] };

const INDENT_INDICATOR = "\u203A";

function flattenFolders(
  tree: FolderNodeData[],
  depth = 0,
  acc: { folder: FolderNodeData; depth: number }[] = []
): { folder: FolderNodeData; depth: number }[] {
  for (const f of tree) {
    acc.push({ folder: f, depth });
    if (f.children?.length) flattenFolders(f.children, depth + 1, acc);
  }
  return acc;
}

function collectSubtreeIds(folder: FolderNodeData): Set<string> {
  const ids = new Set<string>();
  const walk = (f: FolderNodeData) => {
    ids.add(f.id);
    (f.children || []).forEach(walk);
  };
  walk(folder);
  return ids;
}

function indentedLabel(name: string, depth: number): string {
  return depth === 0 ? name : `${"\u3000".repeat(depth)}${INDENT_INDICATOR} ${name}`;
}

const FolderIcon = memo(({ open }: { open: boolean }) => (
  <svg
    className={`sidebar-folder-icon ${open ? "text-primary/70" : "text-muted-foreground/55"}`}
    viewBox="0 0 16 16"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth={0.2}
  >
    {open ? (
      <path d="M2 4.5A1.5 1.5 0 013.5 3h2.172a1 1 0 01.707.293L8.293 5.207a1 1 0 00.707.293H12.5A1.5 1.5 0 0114 7v4.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5z" />
    ) : (
      <path d="M2 5.5A1.5 1.5 0 013.5 4h2.672a.5.5 0 01.353.146L8.06 5.68a.5.5 0 00.353.147H12.5A1.5 1.5 0 0114 7.33v4.17a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5z" />
    )}
  </svg>
));

FolderIcon.displayName = "FolderIcon";

interface FolderNodeProps {
  folder: FolderNodeData;
  folderNotes: Note[];
  hasActiveDescendant: boolean;
  expanded: boolean;
  notesByFolder: Map<string, Note[]>;
  activeAncestorSet: Set<string>;
  expandedSet: Set<string>;
  onToggleExpand: (id: string, force?: boolean) => void;
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
  level: number;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  allFolders?: FolderNodeData[];
  focusedId: string | null;
  registerFocusable: (id: string, el: HTMLElement | null) => void;
}

export function FolderNode({
  folder,
  folderNotes,
  hasActiveDescendant,
  expanded,
  notesByFolder,
  activeAncestorSet,
  expandedSet,
  onToggleExpand,
  activeNoteId,
  onNoteSelect,
  onNoteDelete,
  onNewNote,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
  onMoveNoteToFolder,
  onMoveNoteToRoot,
  onReorderFolder,
  onCopyNote,
  onReorderNotesInFolder,
  level,
  selectionMode,
  selectedIds,
  onToggleSelect,
  allFolders,
  focusedId,
  registerFocusable,
}: FolderNodeProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const { show } = useContextMenu();
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `folder-drop-${folder.id}` });
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({ id: `folder-drag-${folder.id}`, data: { type: "folder", folder } });

  const renameInputRef = useRef<HTMLInputElement>(null);

  const combinedRef = useCallback(
    (node: HTMLElement | null) => {
      setDropRef(node);
      setDragRef(node);
      registerFocusable(`folder:${folder.id}`, node);
    },
    [setDropRef, setDragRef, registerFocusable, folder.id]
  );

  useEffect(() => {
    if (expanded && activeNoteId && hasActiveDescendant) {
      requestAnimationFrame(() => {
        document.getElementById(`note-item-${activeNoteId}`)?.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      });
    }
  }, [expanded, activeNoteId, hasActiveDescendant]);

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  const children = folder.children || [];
  const sortedFolderNotes = useMemo(() => sortNotes(folderNotes), [folderNotes]);

  const handleRename = () => {
    if (renameValue.trim()) {
      onRenameFolder(folder.id, renameValue.trim());
    } else {
      setRenameValue(folder.name);
    }
    setIsRenaming(false);
  };

  const buildFolderMoveTargets = useCallback((): ContextMenuItem[] => {
    const excludeIds = collectSubtreeIds(folder);
    return flattenFolders(allFolders || [])
      .filter(item => !excludeIds.has(item.folder.id))
      .map(item => ({
        label: indentedLabel(item.folder.name, item.depth),
        onClick: () => onReorderFolder?.(folder.id, item.folder.id),
      }));
  }, [folder, allFolders, onReorderFolder]);

  const buildNoteMoveTargets = useCallback(
    (note: Note): ContextMenuItem[] => {
      const currentFolderIds = new Set(note.folderIds || []);
      return flattenFolders(allFolders || [])
        .filter(item => !currentFolderIds.has(item.folder.id))
        .map(item => ({
          label: indentedLabel(item.folder.name, item.depth),
          onClick: () => onMoveNoteToFolder?.(note.id, item.folder.id),
        }));
    },
    [allFolders, onMoveNoteToFolder]
  );

  const handleFolderContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const moveSubMenu = buildFolderMoveTargets();
      const folderIsInParent = folder.parentId !== null;

      const menuItems: ContextMenuItem[] = [
        {
          label: "新建笔记",
          onClick: () => {
            onNewNote([folder.id]);
            onToggleExpand(folder.id, true);
          },
        },
        {
          label: "新建子文件夹",
          onClick: () => {
            onCreateFolder(folder.id);
            onToggleExpand(folder.id, true);
          },
        },
        { label: "重命名", onClick: () => setIsRenaming(true), shortcut: "F2" },
        { separator: true, label: "" },
        ...(folderIsInParent
          ? [
              {
                label: "移动到根目录",
                onClick: () => onReorderFolder?.(folder.id, null),
              },
            ]
          : []),
        ...(moveSubMenu.length > 0
          ? [
              {
                label: "移动到",
                children: moveSubMenu,
              },
            ]
          : []),
        { label: "删除", danger: true, onClick: () => onDeleteFolder(folder.id) },
      ];

      show(e.clientX, e.clientY, menuItems);
    },
    [
      folder,
      buildFolderMoveTargets,
      onNewNote,
      onCreateFolder,
      onDeleteFolder,
      onReorderFolder,
      onToggleExpand,
      show,
    ]
  );

  const noteContextMenuItems = useCallback(
    (note: Note): ContextMenuItem[] => {
      const moveTargets = buildNoteMoveTargets(note);
      const hasFolder = note.folderIds && note.folderIds.length > 0;

      return [
        { label: "复制笔记", onClick: () => onCopyNote?.(note.id) },
        { separator: true, label: "" },
        ...(hasFolder
          ? [
              {
                label: "移动到根目录",
                onClick: () => onMoveNoteToRoot?.(note.id),
              } as ContextMenuItem,
            ]
          : []),
        {
          label: "移动到",
          children: moveTargets,
          disabled: moveTargets.length === 0,
        },
        { separator: true, label: "" },
        { label: "删除", danger: true, onClick: () => onNoteDelete(note.id) },
      ];
    },
    [buildNoteMoveTargets, onNoteDelete, onMoveNoteToRoot, onCopyNote]
  );

  if (isDragging) return null;

  const isFocused = focusedId === `folder:${folder.id}`;

  return (
    <div className="sidebar-folder">
      <div
        ref={combinedRef}
        className={`sidebar-folder-header group ${isOver ? "sidebar-folder-header--drop-target" : ""} ${isFocused ? "sidebar-folder-header--focused" : ""}`}
        style={{ paddingLeft: `${level * 16 + 6}px` }}
        data-focusable-id={`folder:${folder.id}`}
        onClick={() => onToggleExpand(folder.id)}
        onContextMenu={handleFolderContextMenu}
        onKeyDown={e => {
          if (isRenaming) return;
          if (e.key === "Enter") {
            e.preventDefault();
            onToggleExpand(folder.id);
          } else if (e.key === "F2") {
            e.preventDefault();
            setIsRenaming(true);
          }
        }}
        {...attributes}
        {...listeners}
      >
        <svg
          className={`sidebar-folder-chevron ${expanded ? "sidebar-folder-chevron--open" : ""}`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {expanded ? <path d="M4 8h8" /> : <path d="M6 4l4 4-4 4" />}
        </svg>

        <FolderIcon open={expanded} />

        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            value={renameValue}
            onChange={event => setRenameValue(event.target.value)}
            onBlur={handleRename}
            onKeyDown={event => {
              if (event.key === "Enter") handleRename();
              if (event.key === "Escape") {
                setRenameValue(folder.name);
                setIsRenaming(false);
              }
            }}
            className="sidebar-folder-rename-input"
            onClick={event => event.stopPropagation()}
            onPointerDown={event => event.stopPropagation()}
          />
        ) : (
          <span className="sidebar-folder-name">{folder.name}</span>
        )}

        <span className="sidebar-folder-count">
          {folderNotes.length > 0 ? folderNotes.length : ""}
        </span>

        <div
          className="sidebar-folder-actions opacity-0 group-hover:opacity-100"
          onPointerDown={event => event.stopPropagation()}
        >
          <button
            onClick={event => {
              event.stopPropagation();
              onNewNote([folder.id]);
              onToggleExpand(folder.id, true);
            }}
            className="sidebar-folder-action-btn"
            title="新建笔记"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4.5 1.5h4.672a1 1 0 01.707.293l3.328 3.328a1 1 0 01.293.707V13a1.5 1.5 0 01-1.5 1.5h-7.5A1.5 1.5 0 013 13V3a1.5 1.5 0 011.5-1.5z" />
              <path d="M8 7v3M6.5 8.5h3" />
            </svg>
          </button>
          <button
            onClick={event => {
              event.stopPropagation();
              onCreateFolder(folder.id);
              onToggleExpand(folder.id, true);
            }}
            className="sidebar-folder-action-btn"
            title="新建子文件夹"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 5.5A1.5 1.5 0 013.5 4h2.672a.5.5 0 01.353.146L8.06 5.68a.5.5 0 00.353.147H12.5A1.5 1.5 0 0114 7.33v4.17a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5z" />
              <path d="M8 7v3M6.5 8.5h3" />
            </svg>
          </button>
          <button
            onClick={event => {
              event.stopPropagation();
              setIsRenaming(true);
            }}
            className="sidebar-folder-action-btn"
            title="重命名"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11.5 2.5l2 2-8 8H3.5v-2z" />
            </svg>
          </button>
          <button
            onClick={event => {
              event.stopPropagation();
              onDeleteFolder(folder.id);
            }}
            className="sidebar-folder-action-btn sidebar-folder-action-btn--danger"
            title="删除"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`sidebar-folder-children-wrapper ${expanded ? "sidebar-folder-children-wrapper--expanded" : ""}`}
        style={{
          opacity: expanded ? 1 : 0,
          transform: expanded ? "translateY(0)" : "translateY(-4px)",
        }}
      >
        <div className="sidebar-folder-children">
          {children.map(child => (
            <FolderNode
              key={child.id}
              folder={child}
              folderNotes={notesByFolder.get(child.id) || []}
              hasActiveDescendant={activeAncestorSet.has(child.id)}
              expanded={expandedSet.has(child.id)}
              notesByFolder={notesByFolder}
              activeAncestorSet={activeAncestorSet}
              expandedSet={expandedSet}
              onToggleExpand={onToggleExpand}
              activeNoteId={activeNoteId}
              onNoteSelect={onNoteSelect}
              onNoteDelete={onNoteDelete}
              onNewNote={onNewNote}
              onCreateFolder={onCreateFolder}
              onDeleteFolder={onDeleteFolder}
              onRenameFolder={onRenameFolder}
              onMoveNoteToFolder={onMoveNoteToFolder}
              onMoveNoteToRoot={onMoveNoteToRoot}
              onReorderFolder={onReorderFolder}
              onCopyNote={onCopyNote}
              onReorderNotesInFolder={onReorderNotesInFolder}
              level={level + 1}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              allFolders={allFolders}
              focusedId={focusedId}
              registerFocusable={registerFocusable}
            />
          ))}
          <SortableFolderNotes
            folderId={folder.id}
            notes={sortedFolderNotes}
            level={level}
            activeNoteId={activeNoteId}
            onNoteSelect={onNoteSelect}
            onNoteDelete={onNoteDelete}
            onReorderNotesInFolder={onReorderNotesInFolder}
            onContextMenuItems={noteContextMenuItems}
            show={show}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            focusedId={focusedId}
            registerFocusable={registerFocusable}
          />
          {children.length === 0 && folderNotes.length === 0 && (
            <div
              className="sidebar-folder-empty-hint"
              style={{ paddingLeft: `${level * 16 + 22}px` }}
              onClick={event => {
                event.stopPropagation();
                onNewNote([folder.id]);
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 3v10M13 8H3" />
              </svg>
              <span>新建笔记</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SortableFolderNotesProps {
  folderId: string;
  notes: Note[];
  level: number;
  activeNoteId: string | null;
  onNoteSelect: (id: string) => void;
  onNoteDelete: (id: string) => void;
  onReorderNotesInFolder?: (folderId: string, activeId: string, overId: string) => void;
  onContextMenuItems: (note: Note) => ContextMenuItem[];
  show: (x: number, y: number, items: ContextMenuItem[]) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  focusedId: string | null;
  registerFocusable: (id: string, el: HTMLElement | null) => void;
}

function SortableFolderNotes({
  folderId,
  notes,
  level,
  activeNoteId,
  onNoteSelect,
  onNoteDelete,
  onReorderNotesInFolder,
  onContextMenuItems,
  show,
  selectionMode,
  selectedIds,
  onToggleSelect,
  focusedId,
  registerFocusable,
}: SortableFolderNotesProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const ids = notes.map(n => n.id);

  const handleDragEnd = (event: {
    active: { id: string | number };
    over: { id: string | number } | null;
  }) => {
    const { active, over } = event;
    if (over && active.id !== over.id && onReorderNotesInFolder) {
      onReorderNotesInFolder(folderId, String(active.id), String(over.id));
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {notes.map(note => (
          <SortableFolderNoteItem
            key={note.id}
            note={note}
            level={level}
            isActive={note.id === activeNoteId}
            onClick={() => onNoteSelect(note.id)}
            onDelete={() => onNoteDelete(note.id)}
            onContextMenuItems={onContextMenuItems}
            showFn={show}
            selectionMode={selectionMode}
            selected={selectedIds?.has(note.id)}
            onToggleSelect={() => onToggleSelect?.(note.id)}
            focused={focusedId === `note:${note.id}`}
            registerFocusable={registerFocusable}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

interface SortableFolderNoteItemProps {
  note: Note;
  level: number;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onContextMenuItems: (note: Note) => ContextMenuItem[];
  showFn: (x: number, y: number, items: ContextMenuItem[]) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  focused: boolean;
  registerFocusable: (id: string, el: HTMLElement | null) => void;
}

function SortableFolderNoteItem({
  note,
  level,
  isActive,
  onClick,
  onDelete,
  onContextMenuItems,
  showFn,
  selectionMode,
  selected,
  onToggleSelect,
  focused,
  registerFocusable,
}: SortableFolderNoteItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
  });

  const setRef = useCallback(
    (node: HTMLElement | null) => {
      setNodeRef(node);
      registerFocusable(`note:${note.id}`, node);
    },
    [setNodeRef, registerFocusable, note.id]
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    paddingLeft: `${level * 16 + 22}px`,
  };

  return (
    <div
      ref={setRef}
      style={style}
      id={`note-item-${note.id}`}
      data-focusable-id={`note:${note.id}`}
      className={focused ? "sidebar-note-row--focused" : ""}
      onContextMenu={e => {
        e.preventDefault();
        e.stopPropagation();
        showFn(e.clientX, e.clientY, onContextMenuItems(note));
      }}
      {...attributes}
      {...listeners}
    >
      <NoteItem
        note={note}
        isActive={isActive}
        onClick={onClick}
        onDelete={onDelete}
        selectionMode={selectionMode}
        selected={selected}
        onToggleSelect={onToggleSelect}
      />
    </div>
  );
}
