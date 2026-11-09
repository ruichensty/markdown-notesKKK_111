import type { Note } from "@types";

export class NoteConflictError extends Error {
  constructor(
    public readonly noteId: string,
    message: string
  ) {
    super(message);
    this.name = "NoteConflictError";
  }
}

export function matchesNoteBaseline(actual: Note | undefined, expected: Note | null): boolean {
  if (!actual || !expected) return !actual && !expected;
  return (
    actual.id === expected.id &&
    actual.updatedAt === expected.updatedAt &&
    actual.title === expected.title &&
    actual.content === expected.content &&
    actual.deletedAt === expected.deletedAt &&
    actual.order === expected.order &&
    JSON.stringify(actual.folderIds) === JSON.stringify(expected.folderIds) &&
    JSON.stringify(actual.attachments) === JSON.stringify(expected.attachments)
  );
}
