import type { BackupFile } from "./backup";
import { parseAiUiTheme } from "./aiUiTheme";

export const BACKUP_LIMITS = {
  fileBytes: 256 * 1024 * 1024,
  decodedAttachmentBytes: 128 * 1024 * 1024,
  recordCount: 100_000,
  textChars: 16 * 1024 * 1024,
  idChars: 256,
} as const;

type RecordValue = Record<string, unknown>;

function requireValid(valid: unknown, field: string): asserts valid {
  if (!valid) throw new Error(`备份数据无效：${field}`);
}

function record(value: unknown, field: string): RecordValue {
  requireValid(typeof value === "object" && value !== null && !Array.isArray(value), field);
  return value as RecordValue;
}

function text(
  value: unknown,
  field: string,
  max: number = BACKUP_LIMITS.textChars
): asserts value is string {
  requireValid(typeof value === "string" && value.length <= max, field);
}

function id(value: unknown, field: string): asserts value is string {
  text(value, field, BACKUP_LIMITS.idChars);
  requireValid(
    value.trim().length > 0 && !Array.from(value).some(char => char.charCodeAt(0) < 32),
    field
  );
}

function timestamp(value: unknown, field: string): void {
  requireValid(
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 8.64e15,
    field
  );
}

function list(value: unknown, field: string): unknown[] {
  requireValid(Array.isArray(value) && value.length <= BACKUP_LIMITS.recordCount, field);
  return value;
}

function records(value: unknown, field: string, key = "id"): RecordValue[] {
  const ids = new Set<string>();
  return list(value, field).map((entry, index) => {
    const item = record(entry, `${field}[${index}]`);
    id(item[key], `${field}.${key}`);
    requireValid(!ids.has(item[key]), `${field} 包含重复 ${key}`);
    ids.add(item[key]);
    return item;
  });
}

function jsonValue(value: unknown, depth = 0): void {
  requireValid(depth <= 16, "设置嵌套过深");
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "string") {
    text(value, "设置字符串");
    return;
  }
  if (typeof value === "number") {
    requireValid(Number.isFinite(value), "设置数字");
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of list(value, "设置列表")) jsonValue(entry, depth + 1);
    return;
  }
  const source = record(value, "设置值");
  for (const [key, entry] of Object.entries(source)) {
    requireValid(!["__proto__", "constructor", "prototype"].includes(key), "设置包含危险键");
    jsonValue(entry, depth + 1);
  }
}

function validateSettings(value: unknown): RecordValue {
  const settings = record(value, "settings.value");
  const booleanKeys = new Set([
    "autoSave",
    "showLineNumbers",
    "focusMode",
    "typewriterMode",
    "autoPair",
    "typingSound",
    "doodleLayer",
    "eyeCare",
    "healthReminder",
    "particleEffects",
    "aiAssistant",
    "aiAvatarTips",
    "aiAvatarTipDismissed",
    "aiTtsAuto",
  ]);
  const numericKeys = new Set([
    "lineHeight",
    "sidebarWidth",
    "reminderInterval",
    "aiTtsRate",
    "ttsApiSpeed",
  ]);
  const stringKeys = new Set([
    "accentColor",
    "aiApiBaseUrl",
    "aiApiKey",
    "aiModel",
    "aiTtsVoiceName",
    "ttsApiBaseUrl",
    "ttsApiKey",
    "ttsApiModel",
    "ttsApiVoice",
  ]);
  const enums: Record<string, string[]> = {
    fontFamily: ["sans", "serif", "mono"],
    homeLayout: ["quotes", "dashboard", "minimal", "curtain", "writer"],
    aiAvatarMode: ["robot", "cat", "cyber-girl", "custom-image"],
    aiAvatarSkin: ["aurora", "peach", "midnight"],
    aiAvatarAnimation: ["full", "reduced", "off"],
    aiUiStyle: ["companion", "pet", "minimal", "custom"],
    aiProvider: ["zhipu", "deepseek", "moonshot", "openai", "custom"],
    ttsEngine: ["browser", "api"],
  };
  for (const [key, entry] of Object.entries(settings)) {
    if (booleanKeys.has(key)) requireValid(typeof entry === "boolean", `settings.${key}`);
    if (numericKeys.has(key))
      requireValid(
        typeof entry === "number" && Number.isFinite(entry) && entry > 0,
        `settings.${key}`
      );
    if (stringKeys.has(key)) text(entry, `settings.${key}`);
    if (Object.prototype.hasOwnProperty.call(enums, key))
      requireValid(typeof entry === "string" && enums[key].includes(entry), `settings.${key}`);
  }
  if (settings.fontSize !== undefined)
    requireValid(
      ["sm", "md", "lg"].includes(String(settings.fontSize)) ||
        (typeof settings.fontSize === "number" &&
          settings.fontSize >= 8 &&
          settings.fontSize <= 96),
      "settings.fontSize"
    );
  if (settings.expandedFolders !== undefined)
    for (const entry of list(settings.expandedFolders, "expandedFolders"))
      id(entry, "expandedFolders.id");
  if (settings.aiAvatarCustomImageId != null)
    id(settings.aiAvatarCustomImageId, "aiAvatarCustomImageId");
  if (settings.aiWidgetPos != null) {
    const position = record(settings.aiWidgetPos, "aiWidgetPos");
    requireValid(
      typeof position.x === "number" &&
        Number.isFinite(position.x) &&
        typeof position.y === "number" &&
        Number.isFinite(position.y),
      "aiWidgetPos"
    );
  }
  if (settings.aiQuickPrompts !== undefined)
    for (const prompt of records(settings.aiQuickPrompts, "aiQuickPrompts")) {
      text(prompt.label, "prompt.label", 256);
      text(prompt.text, "prompt.text");
      if (prompt.needsNote !== undefined)
        requireValid(typeof prompt.needsNote === "boolean", "prompt.needsNote");
    }
  if (settings.aiCustomUiTheme != null) parseAiUiTheme(settings.aiCustomUiTheme);
  return settings;
}

export function validateBackupData(raw: unknown): BackupFile {
  const source = record(raw, "文件格式不正确");
  requireValid(source.format === "markdown-notes-backup", "缺少 markdown-notes-backup 标识");
  requireValid(
    typeof source.version === "number" && Number.isInteger(source.version) && source.version >= 1,
    "版本号"
  );
  requireValid(source.version <= 2, "来自更新版本的备份，请先升级应用");
  timestamp(source.exportedAt, "exportedAt");
  const data = record(source.data, "data");
  const notes = records(data.notes, "notes");
  const folders = records(data.folders, "folders");
  const templates = records(data.templates, "templates");
  const chats = records(data.aiChats, "aiChats");
  const settings = records(data.settings, "settings", "key");
  const files = records(data.files, "附件 files");
  const versions = records(
    source.version === 1 && data.noteVersions === undefined ? [] : data.noteVersions,
    "noteVersions"
  );
  requireValid(
    notes.length +
      folders.length +
      templates.length +
      chats.length +
      settings.length +
      files.length +
      versions.length <=
      BACKUP_LIMITS.recordCount,
    "记录数量超限"
  );
  const noteIds = new Set(notes.map(note => note.id));
  const folderIds = new Set(folders.map(folder => folder.id));
  const fileIds = new Set(files.map(file => file.id));
  let textChars = 0;
  const body = (entry: RecordValue, titleKey = "title") => {
    text(entry[titleKey], titleKey, 4096);
    text(entry.content, "content");
    textChars += (entry.content as string).length + (entry[titleKey] as string).length;
    requireValid(textChars * 2 <= BACKUP_LIMITS.fileBytes, "正文总量超限");
  };
  const attachmentReferences = (content: string) => {
    for (const match of content.matchAll(/attachment:\/\/([\w-]+)/g))
      requireValid(fileIds.has(match[1]), "正文引用了不存在的附件");
  };
  for (const note of notes) {
    body(note);
    timestamp(note.createdAt, "note.createdAt");
    timestamp(note.updatedAt, "note.updatedAt");
    if (note.deletedAt !== undefined) timestamp(note.deletedAt, "note.deletedAt");
    if (note.order !== undefined)
      requireValid(
        typeof note.order === "number" && Number.isSafeInteger(note.order) && note.order >= 0,
        "note.order"
      );
    if (note.folderIds !== undefined)
      for (const folderId of list(note.folderIds, "note.folderIds"))
        requireValid(folderIds.has(folderId), "笔记引用了不存在的文件夹");
    if (note.attachments !== undefined)
      for (const attachment of records(note.attachments, "note.attachments")) {
        requireValid(fileIds.has(attachment.id), "附件元数据引用不存在的文件");
        text(attachment.fileName, "附件.fileName", 4096);
        text(attachment.fileType, "附件.fileType", 256);
        timestamp(attachment.uploadedAt, "附件.uploadedAt");
        requireValid(
          typeof attachment.fileSize === "number" &&
            Number.isSafeInteger(attachment.fileSize) &&
            attachment.fileSize >= 0,
          "附件.fileSize"
        );
      }
    attachmentReferences(note.content as string);
  }
  const parents = new Map<unknown, unknown>();
  for (const folder of folders) {
    text(folder.name, "folder.name", 4096);
    timestamp(folder.createdAt, "folder.createdAt");
    requireValid(folder.parentId === null || folderIds.has(folder.parentId), "文件夹父级不存在");
    parents.set(folder.id, folder.parentId);
  }
  const visited = new Set<unknown>();
  for (const folder of folders) {
    const path = new Set<unknown>();
    let current: unknown = folder.id;
    while (current !== null && !visited.has(current)) {
      requireValid(!path.has(current), "文件夹包含循环引用");
      path.add(current);
      current = parents.get(current);
    }
    for (const entry of path) visited.add(entry);
  }
  for (const template of templates) {
    body(template, "name");
    text(template.description, "template.description");
    requireValid(typeof template.isBuiltin === "boolean", "template.isBuiltin");
    timestamp(template.createdAt, "template.createdAt");
    timestamp(template.updatedAt, "template.updatedAt");
  }
  let messages = 0;
  for (const chat of chats) {
    text(chat.title, "chat.title", 4096);
    timestamp(chat.createdAt, "chat.createdAt");
    timestamp(chat.updatedAt, "chat.updatedAt");
    for (const value of list(chat.messages, "chat.messages")) {
      requireValid(++messages <= BACKUP_LIMITS.recordCount, "消息数量超限");
      const message = record(value, "message");
      requireValid(["user", "assistant", "system"].includes(String(message.role)), "message.role");
      text(message.content, "message.content");
      timestamp(message.ts, "message.ts");
    }
  }
  for (const version of versions) {
    body(version);
    requireValid(noteIds.has(version.noteId), "版本引用了不存在的笔记");
    timestamp(version.createdAt, "version.createdAt");
    requireValid(["auto", "manual", "restore"].includes(String(version.source)), "version.source");
    attachmentReferences(version.content as string);
  }
  let decodedBytes = 0;
  for (const file of files) {
    id(file.noteId, "附件.noteId");
    text(file.fileName, "附件.fileName", 4096);
    text(file.fileType, "附件.fileType", 256);
    text(
      file.dataBase64,
      "附件.dataBase64",
      Math.ceil(BACKUP_LIMITS.decodedAttachmentBytes / 3) * 4
    );
    requireValid(
      file.dataBase64.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(file.dataBase64),
      "附件 Base64 无效"
    );
    decodedBytes +=
      (file.dataBase64.length / 4) * 3 -
      (file.dataBase64.endsWith("==") ? 2 : file.dataBase64.endsWith("=") ? 1 : 0);
    requireValid(decodedBytes <= BACKUP_LIMITS.decodedAttachmentBytes, "附件总量超过 128 MB");
  }
  for (const entry of settings) {
    jsonValue(entry.value);
    if (entry.key === "settings") {
      const value = validateSettings(entry.value);
      if (value.aiAvatarCustomImageId != null)
        requireValid(fileIds.has(value.aiAvatarCustomImageId), "头像文件不存在");
    }
    if (entry.key === "theme")
      requireValid(["light", "dark", "black-rainbow"].includes(String(entry.value)), "theme");
  }
  return { ...source, data: { ...data, noteVersions: versions } } as unknown as BackupFile;
}
