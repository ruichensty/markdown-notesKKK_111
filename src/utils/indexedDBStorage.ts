import type { Note, Folder, Theme, StorageData } from "@types";

const DB_NAME = "markdown-notes-db";
const DB_VERSION = 1;
const STORE_NOTES = "notes";
const STORE_FOLDERS = "folders";
const STORE_SETTINGS = "settings";
const STORE_FILES = "files";

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        const noteStore = db.createObjectStore(STORE_NOTES, { keyPath: "id" });
        noteStore.createIndex("updatedAt", "updatedAt", { unique: false });
        noteStore.createIndex("folderIds", "folderIds", { unique: false, multiEntry: true });
      }

      if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
        db.createObjectStore(STORE_FOLDERS, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains(STORE_FILES)) {
        const fileStore = db.createObjectStore(STORE_FILES, { keyPath: "id" });
        fileStore.createIndex("noteId", "noteId", { unique: false });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onclose = () => {
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });
}

function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    db =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const req = work(store);
        let result: T;

        req.onsuccess = () => {
          result = req.result;
        };
        req.onerror = () => {
          reject(req.error ?? transaction.error);
        };
        transaction.oncomplete = () => {
          resolve(result);
        };
        transaction.onerror = () => {
          reject(transaction.error);
        };
        transaction.onabort = () => {
          reject(transaction.error);
        };
      })
  );
}

export async function idbGetAllNotes(): Promise<Note[]> {
  return tx<Note[]>(STORE_NOTES, "readonly", s => s.getAll());
}

export async function idbGetNote(id: string): Promise<Note | undefined> {
  return tx<Note | undefined>(STORE_NOTES, "readonly", s => s.get(id));
}

export async function idbSaveNote(note: Note): Promise<void> {
  await tx(STORE_NOTES, "readwrite", s => s.put(note));
}

export async function idbDeleteNote(id: string): Promise<void> {
  await tx<undefined>(STORE_NOTES, "readwrite", s => s.delete(id));
}

export async function idbSaveAllNotes(notes: Note[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NOTES, "readwrite");
    const store = transaction.objectStore(STORE_NOTES);
    const clearRequest = store.clear();
    clearRequest.onerror = () => reject(clearRequest.error ?? transaction.error);
    for (const note of notes) {
      const putRequest = store.put(note);
      putRequest.onerror = () => reject(putRequest.error ?? transaction.error);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function idbGetAllFolders(): Promise<Folder[]> {
  return tx<Folder[]>(STORE_FOLDERS, "readonly", s => s.getAll());
}

export async function idbSaveAllFolders(folders: Folder[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_FOLDERS, "readwrite");
    const store = transaction.objectStore(STORE_FOLDERS);
    const clearRequest = store.clear();
    clearRequest.onerror = () => reject(clearRequest.error ?? transaction.error);
    for (const folder of folders) {
      const putRequest = store.put(folder);
      putRequest.onerror = () => reject(putRequest.error ?? transaction.error);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function idbGetSetting<T>(key: string): Promise<T | undefined> {
  const result = await tx<{ key: string; value: T } | undefined>(STORE_SETTINGS, "readonly", s =>
    s.get(key)
  );
  return result?.value;
}

export async function idbSetSetting<T>(key: string, value: T): Promise<void> {
  await tx(STORE_SETTINGS, "readwrite", s => s.put({ key, value }));
}

export async function migrateFromLocalStorage(): Promise<void> {
  const migrated = localStorage.getItem("idb-migrated");
  if (migrated) return;

  const oldKey = "markdown-notes-app";
  const raw = localStorage.getItem(oldKey);
  if (!raw) {
    localStorage.setItem("idb-migrated", "true");
    return;
  }

  try {
    const data: StorageData = JSON.parse(raw);
    if (data.notes?.length) await idbSaveAllNotes(data.notes);
    if (data.folders?.length) await idbSaveAllFolders(data.folders);
    if (data.theme) await idbSetSetting("theme", data.theme);
    localStorage.setItem("idb-migrated", "true");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

export async function loadAllData(): Promise<StorageData> {
  const [notes, folders, theme] = await Promise.all([
    idbGetAllNotes(),
    idbGetAllFolders(),
    idbGetSetting<Theme>("theme"),
  ]);
  return {
    notes: notes || [],
    folders: folders || [],
    theme: theme || "light",
  };
}

export async function idbSaveFile(
  id: string,
  noteId: string,
  data: ArrayBuffer,
  fileName: string,
  fileType: string
): Promise<void> {
  await tx(STORE_FILES, "readwrite", s =>
    s.put({ id, noteId, data, fileName, fileType, size: data.byteLength, createdAt: Date.now() })
  );
}

export async function idbGetFile(
  id: string
): Promise<{ data: ArrayBuffer; fileName: string; fileType: string } | undefined> {
  return tx(STORE_FILES, "readonly", s => s.get(id));
}

export async function idbDeleteFile(id: string): Promise<void> {
  await tx<undefined>(STORE_FILES, "readwrite", s => s.delete(id));
}
