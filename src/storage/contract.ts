import type { Note, Folder, NoteVersion, NoteTemplate, AiChat, StorageData } from "@types";

export interface StoredFileRecord {
  id: string;
  noteId: string;
  data: ArrayBuffer;
  fileName: string;
  fileType: string;
  size: number;
  createdAt: number;
}

export interface LibrarySnapshot {
  notes: Note[];
  folders: Folder[];
  settings: { key: string; value: unknown }[];
  templates: NoteTemplate[];
  aiChats: AiChat[];
  files: StoredFileRecord[];
  noteVersions: NoteVersion[];
}

export interface LibraryStorage {
  listNotes(): Promise<Note[]>;
  getNote(id: string): Promise<Note | undefined>;
  saveNote(note: Note): Promise<void>;
  deleteNote(id: string): Promise<void>;
  compareAndWriteNote(id: string, expected: Note | null, next: Note | null): Promise<void>;
  purgeNotes(ids: string[]): Promise<void>;
  listFolders(): Promise<Folder[]>;
  saveFolders(folders: Folder[]): Promise<void>;
  getSetting<T>(key: string): Promise<T | undefined>;
  setSetting<T>(key: string, value: T): Promise<void>;
  listSettings(): Promise<{ key: string; value: unknown }[]>;
  getFile(
    id: string
  ): Promise<Pick<StoredFileRecord, "data" | "fileName" | "fileType"> | undefined>;
  saveFile(
    id: string,
    noteId: string,
    data: ArrayBuffer,
    fileName: string,
    fileType: string
  ): Promise<void>;
  deleteFile(id: string): Promise<void>;
  listFiles(): Promise<StoredFileRecord[]>;
  updateAvatar(
    settings: unknown,
    file: StoredFileRecord | null,
    previousId: string | null
  ): Promise<void>;
  listVersions(noteId: string): Promise<NoteVersion[]>;
  listAllVersions(): Promise<NoteVersion[]>;
  saveVersion(version: NoteVersion): Promise<void>;
  deleteVersion(id: string): Promise<void>;
  deleteVersions(noteId: string): Promise<void>;
  pruneVersions(noteId: string, maxVersions?: number, maxBytes?: number): Promise<void>;
  listTemplates(): Promise<NoteTemplate[]>;
  saveTemplate(template: NoteTemplate): Promise<void>;
  deleteTemplate(id: string): Promise<void>;
  listChats(): Promise<AiChat[]>;
  saveChat(chat: AiChat): Promise<void>;
  deleteChat(id: string): Promise<void>;
  replaceLibrary(snapshot: LibrarySnapshot): Promise<void>;
  loadInitialData(): Promise<StorageData>;
  getCachedData(): StorageData | null;
  invalidateCache(): void;
}
