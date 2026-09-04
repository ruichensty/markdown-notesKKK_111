import type { Note, Folder, NoteTemplate, AiChat } from "@types";
import {
  idbGetAllAiChats,
  idbGetAllFiles,
  idbGetAllFolders,
  idbGetAllNotes,
  idbGetAllSettings,
  idbGetAllTemplates,
  idbReplaceAllData,
  type StoredFileRecord,
} from "./indexedDBStorage";

const BACKUP_FORMAT = "markdown-notes-backup";
const BACKUP_VERSION = 1;

interface BackupFileItem {
  id: string;
  noteId: string;
  fileName: string;
  fileType: string;
  dataBase64: string;
}

export interface BackupFile {
  format: string;
  version: number;
  exportedAt: number;
  data: {
    notes: Note[];
    folders: Folder[];
    settings: { key: string; value: unknown }[];
    templates: NoteTemplate[];
    aiChats: AiChat[];
    files: BackupFileItem[];
  };
}

export interface BackupResult {
  blob: Blob;
  filename: string;
  byteSize: number;
  noteCount: number;
  fileCount: number;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function backupTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

export async function createBackup(): Promise<BackupResult> {
  const [notes, folders, settings, templates, aiChats, files] = await Promise.all([
    idbGetAllNotes(),
    idbGetAllFolders(),
    idbGetAllSettings(),
    idbGetAllTemplates(),
    idbGetAllAiChats(),
    idbGetAllFiles(),
  ]);

  const backup: BackupFile = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    data: {
      notes: notes || [],
      folders: folders || [],
      settings,
      templates: templates || [],
      aiChats: aiChats || [],
      files: (files || []).map(f => ({
        id: f.id,
        noteId: f.noteId,
        fileName: f.fileName,
        fileType: f.fileType,
        dataBase64: arrayBufferToBase64(f.data),
      })),
    },
  };

  const json = JSON.stringify(backup);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const byteSize = blob.size;

  return {
    blob,
    filename: `markdown-notes-backup-${backupTimestamp()}.json`,
    byteSize,
    noteCount: backup.data.notes.length,
    fileCount: backup.data.files.length,
  };
}

export function validateBackup(raw: unknown): BackupFile {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("文件格式不正确，不是有效的备份文件");
  }
  const candidate = raw as Partial<BackupFile>;
  if (candidate.format !== BACKUP_FORMAT) {
    throw new Error("文件格式不正确：缺少 markdown-notes-backup 标识");
  }
  if (typeof candidate.version !== "number") {
    throw new Error("备份文件缺少版本号，可能已损坏");
  }
  if (candidate.version > BACKUP_VERSION) {
    throw new Error(
      `备份来自更新版本的应用（v${candidate.version}），当前版本（v${BACKUP_VERSION}）可能无法兼容，请先升级应用`
    );
  }
  const data = candidate.data;
  if (typeof data !== "object" || data === null) {
    throw new Error("备份文件缺少数据内容，可能已损坏");
  }
  for (const field of ["notes", "folders", "settings", "templates", "aiChats", "files"] as const) {
    if (!Array.isArray(data[field])) {
      throw new Error(`备份文件缺少「${field}」数据，可能已损坏`);
    }
  }
  for (const file of data.files) {
    if (typeof file.dataBase64 !== "string") {
      throw new Error("备份中的附件数据损坏，无法恢复");
    }
  }
  return candidate as BackupFile;
}

export async function restoreBackup(file: File): Promise<void> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new Error("无法解析文件内容，请确认选择的是应用导出的 .json 备份");
  }

  const backup = validateBackup(raw);

  const files: StoredFileRecord[] = backup.data.files.map(f => ({
    id: f.id,
    noteId: f.noteId,
    fileName: f.fileName,
    fileType: f.fileType,
    data: base64ToArrayBuffer(f.dataBase64),
    size: 0,
    createdAt: backup.exportedAt,
  }));

  await idbReplaceAllData({
    notes: backup.data.notes,
    folders: backup.data.folders,
    settings: backup.data.settings,
    templates: backup.data.templates,
    aiChats: backup.data.aiChats,
    files,
  });
}
