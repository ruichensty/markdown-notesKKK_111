import type { Note, Folder, NoteTemplate, AiChat, NoteVersion } from "@types";
import {
  idbGetAllAiChats,
  idbGetAllFiles,
  idbGetAllFolders,
  idbGetAllNotes,
  idbGetAllSettings,
  idbGetAllTemplates,
  idbGetAllNoteVersions,
  idbReplaceAllData,
  type StoredFileRecord,
} from "./indexedDBStorage";
import { publishCrossTabChange, type CrossTabDataDomain } from "./crossTabSync";

const BACKUP_FORMAT = "markdown-notes-backup";
const BACKUP_VERSION = 2;
const ENCRYPTED_BACKUP_FORMAT = "markdown-notes-backup-encrypted";
const ENCRYPTED_BACKUP_VERSION = 1;
const PBKDF2_ITERATIONS = 250_000;
const BACKUP_PASSWORD_MIN_LENGTH = 8;

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
    noteVersions: NoteVersion[];
  };
}

export interface BackupResult {
  blob: Blob;
  filename: string;
  byteSize: number;
  noteCount: number;
  fileCount: number;
  versionCount: number;
  encrypted: boolean;
}

export interface EncryptedBackupEnvelope {
  format: typeof ENCRYPTED_BACKUP_FORMAT;
  version: typeof ENCRYPTED_BACKUP_VERSION;
  encryptedAt: number;
  kdf: {
    name: "PBKDF2";
    hash: "SHA-256";
    iterations: number;
    saltBase64: string;
  };
  cipher: {
    name: "AES-GCM";
    ivBase64: string;
    dataBase64: string;
  };
}

export interface BackupInspection {
  encrypted: boolean;
  exportedAt: number;
  byteSize: number;
  noteCount: number;
  folderCount: number;
  templateCount: number;
  aiChatCount: number;
  fileCount: number;
  versionCount: number;
}

export class BackupPasswordRequiredError extends Error {
  constructor() {
    super("此备份已加密，请输入密码后继续");
    this.name = "BackupPasswordRequiredError";
  }
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function requireCrypto(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) throw new Error("当前环境不支持加密备份");
  return globalThis.crypto.subtle;
}

function validatePassword(password: string): void {
  if (password.length < BACKUP_PASSWORD_MIN_LENGTH) {
    throw new Error(`备份密码至少需要 ${BACKUP_PASSWORD_MIN_LENGTH} 个字符`);
  }
}

async function deriveBackupKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<CryptoKey> {
  const subtle = requireCrypto();
  const material = await subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function encryptedAdditionalData(iterations: number): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(
    `${ENCRYPTED_BACKUP_FORMAT}:${ENCRYPTED_BACKUP_VERSION}:${iterations}`
  );
}

function validateEncryptedEnvelope(raw: unknown): EncryptedBackupEnvelope {
  if (typeof raw !== "object" || raw === null) throw new Error("加密备份格式不正确");
  const candidate = raw as Partial<EncryptedBackupEnvelope>;
  if (
    candidate.format !== ENCRYPTED_BACKUP_FORMAT ||
    candidate.version !== ENCRYPTED_BACKUP_VERSION ||
    candidate.kdf?.name !== "PBKDF2" ||
    candidate.kdf.hash !== "SHA-256" ||
    typeof candidate.kdf.iterations !== "number" ||
    candidate.kdf.iterations < 100_000 ||
    candidate.kdf.iterations > 1_000_000 ||
    typeof candidate.kdf.saltBase64 !== "string" ||
    candidate.cipher?.name !== "AES-GCM" ||
    typeof candidate.cipher.ivBase64 !== "string" ||
    typeof candidate.cipher.dataBase64 !== "string"
  ) {
    throw new Error("加密备份元数据无效或已损坏");
  }
  return candidate as EncryptedBackupEnvelope;
}

export async function encryptBackupFile(
  backup: BackupFile,
  password: string
): Promise<EncryptedBackupEnvelope> {
  validatePassword(password);
  const subtle = requireCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveBackupKey(password, salt, PBKDF2_ITERATIONS);
  const plaintext = new TextEncoder().encode(JSON.stringify(backup));
  const encrypted = await subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: encryptedAdditionalData(PBKDF2_ITERATIONS),
      tagLength: 128,
    },
    key,
    plaintext
  );
  return {
    format: ENCRYPTED_BACKUP_FORMAT,
    version: ENCRYPTED_BACKUP_VERSION,
    encryptedAt: Date.now(),
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: PBKDF2_ITERATIONS,
      saltBase64: arrayBufferToBase64(salt.buffer),
    },
    cipher: {
      name: "AES-GCM",
      ivBase64: arrayBufferToBase64(iv.buffer),
      dataBase64: arrayBufferToBase64(encrypted),
    },
  };
}

export async function decryptBackupFile(
  envelope: EncryptedBackupEnvelope,
  password: string
): Promise<BackupFile> {
  validatePassword(password);
  try {
    const subtle = requireCrypto();
    const salt = new Uint8Array(base64ToArrayBuffer(envelope.kdf.saltBase64));
    const iv = new Uint8Array(base64ToArrayBuffer(envelope.cipher.ivBase64));
    if (salt.byteLength !== 16 || iv.byteLength !== 12) throw new Error("invalid lengths");
    const key = await deriveBackupKey(password, salt, envelope.kdf.iterations);
    const plaintext = await subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: encryptedAdditionalData(envelope.kdf.iterations),
        tagLength: 128,
      },
      key,
      base64ToArrayBuffer(envelope.cipher.dataBase64)
    );
    return validateBackup(JSON.parse(new TextDecoder().decode(plaintext)) as unknown);
  } catch {
    throw new Error("无法解密备份：密码错误或文件已损坏");
  }
}

function backupTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

async function collectBackup(): Promise<BackupFile> {
  const [notes, folders, settings, templates, aiChats, files, noteVersions] = await Promise.all([
    idbGetAllNotes(),
    idbGetAllFolders(),
    idbGetAllSettings(),
    idbGetAllTemplates(),
    idbGetAllAiChats(),
    idbGetAllFiles(),
    idbGetAllNoteVersions(),
  ]);

  return {
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
      noteVersions: noteVersions || [],
    },
  };
}

export async function createBackup(password?: string): Promise<BackupResult> {
  const backup = await collectBackup();
  const encrypted = typeof password === "string" && password.length > 0;
  const payload = encrypted ? await encryptBackupFile(backup, password) : backup;
  const json = JSON.stringify(payload);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const byteSize = blob.size;

  return {
    blob,
    filename: `markdown-notes-backup-${backupTimestamp()}${encrypted ? "-encrypted" : ""}.json`,
    byteSize,
    noteCount: backup.data.notes.length,
    fileCount: backup.data.files.length,
    versionCount: backup.data.noteVersions.length,
    encrypted,
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
  if (candidate.version >= 2 && !Array.isArray(data.noteVersions)) {
    throw new Error("备份文件缺少「noteVersions」数据，可能已损坏");
  }
  if (!Array.isArray(data.noteVersions)) data.noteVersions = [];
  for (const file of data.files) {
    if (typeof file.dataBase64 !== "string") {
      throw new Error("备份中的附件数据损坏，无法恢复");
    }
  }
  return candidate as BackupFile;
}

async function readBackupFile(
  file: File,
  password?: string
): Promise<{ backup: BackupFile; encrypted: boolean }> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new Error("无法解析文件内容，请确认选择的是应用导出的 .json 备份");
  }

  if (
    typeof raw === "object" &&
    raw !== null &&
    (raw as { format?: unknown }).format === ENCRYPTED_BACKUP_FORMAT
  ) {
    const envelope = validateEncryptedEnvelope(raw);
    if (!password) throw new BackupPasswordRequiredError();
    return { backup: await decryptBackupFile(envelope, password), encrypted: true };
  }

  return { backup: validateBackup(raw), encrypted: false };
}

export async function inspectBackup(file: File, password?: string): Promise<BackupInspection> {
  const { backup, encrypted } = await readBackupFile(file, password);
  return {
    encrypted,
    exportedAt: backup.exportedAt,
    byteSize: file.size,
    noteCount: backup.data.notes.length,
    folderCount: backup.data.folders.length,
    templateCount: backup.data.templates.length,
    aiChatCount: backup.data.aiChats.length,
    fileCount: backup.data.files.length,
    versionCount: backup.data.noteVersions.length,
  };
}

export async function restoreBackup(file: File, password?: string): Promise<void> {
  const { backup } = await readBackupFile(file, password);

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
    noteVersions: backup.data.noteVersions || [],
  });

  for (const domain of [
    "notes",
    "note-versions",
    "folders",
    "settings",
    "templates",
    "theme",
    "ai-chats",
  ] satisfies CrossTabDataDomain[]) {
    publishCrossTabChange(domain);
  }
}
