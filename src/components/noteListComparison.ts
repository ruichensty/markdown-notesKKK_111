import type { Note } from "@types";

export function sameNotes(a: Note[], b: Note[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.updatedAt !== y.updatedAt ||
      x.title !== y.title ||
      x.content !== y.content ||
      x.order !== y.order ||
      x.deletedAt !== y.deletedAt ||
      x.folderIds !== y.folderIds ||
      x.attachments !== y.attachments
    )
      return false;
  }
  return true;
}
