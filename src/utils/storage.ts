import type { Note, Theme } from "@types";
import {
  loadAllData,
  getAllDataCache,
  invalidateAllDataCache,
  idbGetNote,
  idbSaveNote,
  idbDeleteNote,
  idbGetSetting,
  idbSetSetting,
  idbCompareAndWriteNote,
} from "../storage/libraryStorage";
import { migrateFromLocalStorage } from "./indexedDBStorage";

export { migrateFromLocalStorage, getAllDataCache, invalidateAllDataCache };

export async function saveSingleNote(note: Note, expected?: Note | null): Promise<void> {
  if (expected !== undefined) await idbCompareAndWriteNote(note.id, expected, note);
  else await idbSaveNote(note);
}

export async function loadSingleNote(id: string): Promise<Note | undefined> {
  return idbGetNote(id);
}

export async function deleteSingleNote(id: string, expected?: Note): Promise<void> {
  if (expected) await idbCompareAndWriteNote(id, expected, null);
  else await idbDeleteNote(id);
}

export async function loadNotes(): Promise<Note[]> {
  const data = await loadAllData();
  return data.notes || [];
}

export async function saveTheme(theme: Theme): Promise<void> {
  await idbSetSetting("theme", theme);
}

export async function loadTheme(): Promise<Theme> {
  const theme = await idbGetSetting<Theme>("theme");
  return theme || "light";
}
