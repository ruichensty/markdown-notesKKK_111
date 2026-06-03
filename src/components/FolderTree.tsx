import { useEffect, useState } from "react";
import { NoteItem } from "./NoteItem";
import type { Folder, Note } from "@types";

type FolderNodeData = Folder & { children?: FolderNodeData[] };

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
}

function sortNotesByTitle(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    const ta = (a.title || "Untitled").toLowerCase();
    const tb = (b.title || "Untitled").toLowerCase();
    if (ta !== tb) return ta.localeCompare(tb);
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

function hasActiveDescendant(
  folder: FolderNodeData,
  activeNoteId: string | null,
  notes: Note[]
): boolean {
  if (!activeNoteId) return false;
  const folderNotes = notes.filter(
    note => Array.isArray(note.folderIds) && note.folderIds.includes(folder.id)
  );
  if (folderNotes.some(note => note.id === activeNoteId)) return true;
  return (folder.children || []).some(child => hasActiveDescendant(child, activeNoteId, notes));
}

function FolderNode({
  folder,
  notes,
  activeNoteId,
  onNoteSelect,
  onNoteDelete,
  onNewNote,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
  level,
}: {
  folder: FolderNodeData;
  notes: Note[];
  activeNoteId: string | null;
  onNoteSelect: (id: string) => void;
  onNoteDelete: (id: string) => void;
  onNewNote: (folderIds?: string[]) => void;
  onCreateFolder: (parentId: string | null) => void;
  onDeleteFolder: (id: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  level: number;
}) {
  const [manualState, setManualState] = useState<null | boolean>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);

  const children = folder.children || [];
  const folderNotes = sortNotesByTitle(
    notes.filter(note => Array.isArray(note.folderIds) && note.folderIds.includes(folder.id))
  );
  const hasActiveNote =
    folderNotes.some(note => note.id === activeNoteId) ||
    children.some(child => hasActiveDescendant(child, activeNoteId, notes));
  const expanded = manualState !== null ? manualState : hasActiveNote;

  useEffect(() => {
    if (expanded && activeNoteId && hasActiveNote) {
      requestAnimationFrame(() => {
        document.getElementById(`note-item-${activeNoteId}`)?.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      });
    }
  }, [expanded, activeNoteId, hasActiveNote]);

  const handleRename = () => {
    if (renameValue.trim()) {
      onRenameFolder(folder.id, renameValue.trim());
      setIsRenaming(false);
    }
  };

  return (
    <div className="sidebar-folder">
      <div
        className="sidebar-folder-header group"
        style={{ paddingLeft: `${level * 16 + 6}px` }}
        onClick={() => setManualState(!expanded)}
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
          {expanded ? <path d="M4 8h8" /> : <path d="M4 8h8m-4-4v8" />}
        </svg>

        <svg
          className={`sidebar-folder-icon ${expanded ? "text-primary/70" : "text-muted-foreground/55"}`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 5.5A1.5 1.5 0 013.5 4h2.672a.5.5 0 01.353.146L8.06 5.68a.5.5 0 00.353.147H12.5A1.5 1.5 0 0114 7.33v4.17a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5z" />
        </svg>

        {isRenaming ? (
          <input
            autoFocus
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
          />
        ) : (
          <span className="sidebar-folder-name">{folder.name}</span>
        )}

        <span className="sidebar-folder-count">
          {folderNotes.length > 0 ? folderNotes.length : ""}
        </span>

        <div className="sidebar-folder-actions opacity-0 group-hover:opacity-100">
          <button
            onClick={event => {
              event.stopPropagation();
              onNewNote([folder.id]);
              setManualState(true);
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
              setManualState(true);
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

      {expanded && (
        <div className="sidebar-folder-children">
          {children.map(child => (
            <FolderNode
              key={child.id}
              folder={child}
              notes={notes}
              activeNoteId={activeNoteId}
              onNoteSelect={onNoteSelect}
              onNoteDelete={onNoteDelete}
              onNewNote={onNewNote}
              onCreateFolder={onCreateFolder}
              onDeleteFolder={onDeleteFolder}
              onRenameFolder={onRenameFolder}
              level={level + 1}
            />
          ))}
          {folderNotes.map(note => (
            <div
              key={note.id}
              id={`note-item-${note.id}`}
              style={{ paddingLeft: `${level * 16 + 22}px` }}
            >
              <NoteItem
                note={note}
                isActive={note.id === activeNoteId}
                onClick={() => onNoteSelect(note.id)}
                onDelete={() => onNoteDelete(note.id)}
              />
            </div>
          ))}
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
      )}
    </div>
  );
}

export function FolderTree(props: FolderTreeProps) {
  return (
    <>
      {props.folders.map(folder => (
        <FolderNode key={folder.id} folder={folder} level={0} {...props} />
      ))}
    </>
  );
}
