import { createContext, useContext } from "react";
import type { Note } from "@types";
import type { FolderNodeData } from "@utils/folderTree";

export interface FolderTreeContextValue {
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
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  allFolders?: FolderNodeData[];
  focusedId: string | null;
  registerFocusable: (id: string, el: HTMLElement | null) => void;
  pendingRenameId?: string | null;
  clearPendingRename: () => void;
}

export const FolderTreeContext = createContext<FolderTreeContextValue | null>(null);

export function useFolderTreeContext(): FolderTreeContextValue {
  const ctx = useContext(FolderTreeContext);
  if (!ctx) {
    throw new Error("useFolderTreeContext must be used within a FolderTreeContext.Provider");
  }
  return ctx;
}
