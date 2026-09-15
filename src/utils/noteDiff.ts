import type { Note } from "@types";

export interface NoteDiff {
  added: Note[];
  updated: Note[];
  deleted: Note[];
}

export function diffNotes(snapshot: Note[], previousNotes: Note[]): NoteDiff {
  const prevMap = new Map<string, Note>();
  for (const n of previousNotes) prevMap.set(n.id, n);

  const added: Note[] = [];
  const updated: Note[] = [];

  for (const note of snapshot) {
    const prev = prevMap.get(note.id);
    if (!prev) {
      added.push(note);
    } else if (prev.updatedAt !== note.updatedAt) {
      updated.push(note);
    }
  }

  const currentMap = new Map<string, Note>();
  for (const n of snapshot) currentMap.set(n.id, n);
  const deleted = previousNotes.filter(n => !currentMap.has(n.id));

  return { added, updated, deleted };
}
