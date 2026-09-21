import type { Note, NoteVersion, NoteVersionSource } from "@types";

export const NOTE_VERSION_INTERVAL_MS = 5 * 60 * 1000;
export const NOTE_VERSION_LIMIT = 50;
export const NOTE_VERSION_BYTE_LIMIT = 10 * 1024 * 1024;

export function estimateNoteVersionBytes(version: Pick<NoteVersion, "title" | "content">): number {
  return new TextEncoder().encode(`${version.title}\n${version.content}`).byteLength;
}

export function selectNoteVersionIdsToPrune(
  versions: NoteVersion[],
  maxVersions = NOTE_VERSION_LIMIT,
  maxBytes = NOTE_VERSION_BYTE_LIMIT
): string[] {
  const sorted = [...versions].sort((a, b) => b.createdAt - a.createdAt);
  let retainedCount = 0;
  let retainedBytes = 0;
  const prune: string[] = [];

  for (const version of sorted) {
    const size = estimateNoteVersionBytes(version);
    const isNewest = retainedCount === 0;
    if (
      isNewest ||
      (retainedCount < Math.max(1, maxVersions) && retainedBytes + size <= maxBytes)
    ) {
      retainedCount += 1;
      retainedBytes += size;
    } else {
      prune.push(version.id);
    }
  }
  return prune;
}

export function hasMeaningfulNoteChange(previous: Note, next: Note): boolean {
  return previous.title !== next.title || previous.content !== next.content;
}

export function shouldCreateAutoVersion(lastVersionAt: number | null, now: number): boolean {
  return lastVersionAt === null || now - lastVersionAt >= NOTE_VERSION_INTERVAL_MS;
}

export function createNoteVersion(
  note: Pick<Note, "id" | "title" | "content">,
  source: NoteVersionSource,
  now = Date.now()
): NoteVersion {
  return {
    id: `${note.id}:${now}:${Math.random().toString(36).slice(2, 8)}`,
    noteId: note.id,
    title: note.title,
    content: note.content,
    createdAt: now,
    source,
  };
}
