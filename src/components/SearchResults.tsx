import { NoteItem } from "./NoteItem";
import type { Note } from "@types";

interface SearchResultsProps {
  notes: Note[];
  activeNoteId: string | null;
  onNoteSelect: (id: string) => void;
  onNoteDelete: (id: string) => void;
}

export function SearchResults({
  notes,
  activeNoteId,
  onNoteSelect,
  onNoteDelete,
}: SearchResultsProps) {
  if (notes.length === 0) {
    return (
      <div className="sidebar-empty">
        <p className="text-[10px] text-muted-foreground/60">未找到匹配的笔记</p>
      </div>
    );
  }

  return (
    <>
      {notes.map(note => (
        <NoteItem
          key={note.id}
          note={note}
          isActive={note.id === activeNoteId}
          onClick={() => onNoteSelect(note.id)}
          onDelete={() => onNoteDelete(note.id)}
        />
      ))}
    </>
  );
}
