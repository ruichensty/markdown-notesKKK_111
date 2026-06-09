import type { Note, Theme } from "@types";
import {
  migrateFromLocalStorage,
  loadAllData,
  idbGetNote,
  idbSaveAllNotes,
  idbSaveNote,
  idbDeleteNote,
  idbGetSetting,
  idbSetSetting,
} from "./indexedDBStorage";

export { migrateFromLocalStorage };

export async function saveNotes(notes: Note[]): Promise<void> {
  await idbSaveAllNotes(notes);
}

export async function saveSingleNote(note: Note): Promise<void> {
  await idbSaveNote(note);
}

export async function loadSingleNote(id: string): Promise<Note | undefined> {
  return idbGetNote(id);
}

export async function deleteSingleNote(id: string): Promise<void> {
  await idbDeleteNote(id);
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
