import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { NoteItem } from "./NoteItem";
import type { Note } from "@types";

interface SortableNoteListProps {
  notes: Note[];
  activeNoteId: string | null;
  onNoteSelect: (id: string) => void;
  onNoteDelete: (id: string) => void;
  onReorderNotes?: (activeId: string, overId: string) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

function SortableNoteItem({
  note,
  isActive,
  onClick,
  onDelete,
  selectionMode,
  selected,
  onToggleSelect,
}: {
  note: Note;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: note.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
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

export function SortableNoteList({
  notes,
  activeNoteId,
  onNoteSelect,
  onNoteDelete,
  onReorderNotes,
  selectionMode,
  selectedIds,
  onToggleSelect,
}: SortableNoteListProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && onReorderNotes) {
      onReorderNotes(String(active.id), String(over.id));
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={notes.map(n => n.id)} strategy={verticalListSortingStrategy}>
        {notes.map(note => (
          <SortableNoteItem
            key={note.id}
            note={note}
            isActive={note.id === activeNoteId}
            onClick={() => onNoteSelect(note.id)}
            onDelete={() => onNoteDelete(note.id)}
            selectionMode={selectionMode}
            selected={selectedIds?.has(note.id)}
            onToggleSelect={() => onToggleSelect?.(note.id)}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
