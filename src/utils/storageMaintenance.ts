import type { Note } from "@types";
import {
  idbDeleteFile,
  idbGetAllFiles,
  idbGetAllNotes,
  idbGetSetting,
  type StoredFileRecord,
} from "./indexedDBStorage";

export const ORPHAN_FILE_MIN_AGE_MS = 60 * 60 * 1000;

function collectReferencedFileIds(notes: Note[], avatarImageId: string | null): Set<string> {
  const ids = new Set<string>();
  if (avatarImageId) ids.add(avatarImageId);

  for (const note of notes) {
    for (const attachment of note.attachments || []) ids.add(attachment.id);
    const pattern = /attachment:\/\/([^\s)'"<>]+)/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(note.content)) !== null) ids.add(match[1]);
  }
  return ids;
}

export function findOrphanedFileIds(
  notes: Note[],
  files: StoredFileRecord[],
  avatarImageId: string | null,
  now = Date.now(),
  minAgeMs = ORPHAN_FILE_MIN_AGE_MS
): string[] {
  const referenced = collectReferencedFileIds(notes, avatarImageId);
  return files
    .filter(file => now - file.createdAt >= minAgeMs && !referenced.has(file.id))
    .map(file => file.id);
}

export async function cleanupOrphanedFiles(): Promise<number> {
  const [notes, files, settings] = await Promise.all([
    idbGetAllNotes(),
    idbGetAllFiles(),
    idbGetSetting<{ aiAvatarCustomImageId?: string | null }>("settings"),
  ]);
  const ids = findOrphanedFileIds(
    notes || [],
    files || [],
    settings?.aiAvatarCustomImageId ?? null
  );
  await Promise.all(ids.map(id => idbDeleteFile(id)));
  return ids.length;
}
