import type { LibraryStorage } from "./contract";
import { indexedDbLibraryStorage } from "./indexedDbAdapter";
export type { LibraryStorage, LibrarySnapshot, StoredFileRecord } from "./contract";

let activeStorage: LibraryStorage = indexedDbLibraryStorage;

export function configureLibraryStorage(storage: LibraryStorage): void {
  activeStorage = storage;
}

export function resetLibraryStorage(): void {
  activeStorage = indexedDbLibraryStorage;
}

export const idbGetAllNotes: LibraryStorage["listNotes"] = (...args) =>
  activeStorage.listNotes(...args);

export const idbGetNote: LibraryStorage["getNote"] = (...args) => activeStorage.getNote(...args);

export const idbSaveNote: LibraryStorage["saveNote"] = (...args) => activeStorage.saveNote(...args);

export const idbDeleteNote: LibraryStorage["deleteNote"] = (...args) =>
  activeStorage.deleteNote(...args);

export const idbCompareAndWriteNote: LibraryStorage["compareAndWriteNote"] = (...args) =>
  activeStorage.compareAndWriteNote(...args);

export const idbPurgeNotes: LibraryStorage["purgeNotes"] = (...args) =>
  activeStorage.purgeNotes(...args);

export const idbGetAllFolders: LibraryStorage["listFolders"] = (...args) =>
  activeStorage.listFolders(...args);

export const idbSaveAllFolders: LibraryStorage["saveFolders"] = (...args) =>
  activeStorage.saveFolders(...args);

export function idbGetSetting<T>(key: string): Promise<T | undefined> {
  return activeStorage.getSetting<T>(key);
}

export function idbSetSetting<T>(key: string, value: T): Promise<void> {
  return activeStorage.setSetting(key, value);
}

export const idbGetAllSettings: LibraryStorage["listSettings"] = (...args) =>
  activeStorage.listSettings(...args);

export const idbGetFile: LibraryStorage["getFile"] = (...args) => activeStorage.getFile(...args);

export const idbSaveFile: LibraryStorage["saveFile"] = (...args) => activeStorage.saveFile(...args);

export const idbDeleteFile: LibraryStorage["deleteFile"] = (...args) =>
  activeStorage.deleteFile(...args);

export const idbGetAllFiles: LibraryStorage["listFiles"] = (...args) =>
  activeStorage.listFiles(...args);

export const idbUpdateSettingsAndAvatarFile: LibraryStorage["updateAvatar"] = (...args) =>
  activeStorage.updateAvatar(...args);

export const idbGetNoteVersions: LibraryStorage["listVersions"] = (...args) =>
  activeStorage.listVersions(...args);

export const idbGetAllNoteVersions: LibraryStorage["listAllVersions"] = (...args) =>
  activeStorage.listAllVersions(...args);

export const idbSaveNoteVersion: LibraryStorage["saveVersion"] = (...args) =>
  activeStorage.saveVersion(...args);

export const idbDeleteNoteVersion: LibraryStorage["deleteVersion"] = (...args) =>
  activeStorage.deleteVersion(...args);

export const idbDeleteNoteVersions: LibraryStorage["deleteVersions"] = (...args) =>
  activeStorage.deleteVersions(...args);

export const idbPruneNoteVersions: LibraryStorage["pruneVersions"] = (...args) =>
  activeStorage.pruneVersions(...args);

export const idbGetAllTemplates: LibraryStorage["listTemplates"] = (...args) =>
  activeStorage.listTemplates(...args);

export const idbSaveTemplate: LibraryStorage["saveTemplate"] = (...args) =>
  activeStorage.saveTemplate(...args);

export const idbDeleteTemplate: LibraryStorage["deleteTemplate"] = (...args) =>
  activeStorage.deleteTemplate(...args);

export const idbGetAllAiChats: LibraryStorage["listChats"] = (...args) =>
  activeStorage.listChats(...args);

export const idbSaveAiChat: LibraryStorage["saveChat"] = (...args) =>
  activeStorage.saveChat(...args);

export const idbDeleteAiChat: LibraryStorage["deleteChat"] = (...args) =>
  activeStorage.deleteChat(...args);

export const idbReplaceAllData: LibraryStorage["replaceLibrary"] = (...args) =>
  activeStorage.replaceLibrary(...args);

export const loadAllData: LibraryStorage["loadInitialData"] = (...args) =>
  activeStorage.loadInitialData(...args);

export const getAllDataCache: LibraryStorage["getCachedData"] = (...args) =>
  activeStorage.getCachedData(...args);

export const invalidateAllDataCache: LibraryStorage["invalidateCache"] = (...args) =>
  activeStorage.invalidateCache(...args);
