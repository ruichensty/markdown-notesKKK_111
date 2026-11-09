import { describe, expect, it } from "vitest";
import { validateBackup } from "../backup";
import { BACKUP_LIMITS } from "../backupValidation";

function fixture() {
  return {
    format: "markdown-notes-backup",
    version: 2,
    exportedAt: 1,
    data: {
      notes: [{ id: "n", title: "note", content: "body", createdAt: 1, updatedAt: 1 }],
      folders: [] as unknown[],
      templates: [] as unknown[],
      aiChats: [] as unknown[],
      settings: [] as unknown[],
      files: [] as unknown[],
      noteVersions: [] as unknown[],
    },
  };
}

describe("backup import boundaries", () => {
  it("normalizes v1 without mutating the input", () => {
    const raw = { ...fixture(), version: 1 };
    const { noteVersions: _omitted, ...data } = raw.data;
    const input = { ...raw, data };
    expect(validateBackup(input).data.noteVersions).toEqual([]);
    expect(input.data).not.toHaveProperty("noteVersions");
  });

  it("rejects duplicate IDs", () => {
    const raw = fixture();
    raw.data.notes.push({ ...raw.data.notes[0] });
    expect(() => validateBackup(raw)).toThrow(/重复/);
  });

  it("rejects invalid content and timestamps", () => {
    const raw = fixture();
    raw.data.notes[0].updatedAt = NaN;
    expect(() => validateBackup(raw)).toThrow(/updatedAt/);
    expect(() => validateBackup({ ...fixture(), version: 0 })).toThrow(/版本/);
  });

  it("rejects broken history and attachment references", () => {
    const raw = fixture();
    raw.data.noteVersions.push({
      id: "v",
      noteId: "missing",
      title: "t",
      content: "c",
      createdAt: 1,
      source: "auto",
    });
    expect(() => validateBackup(raw)).toThrow(/版本引用/);
    raw.data.noteVersions = [];
    raw.data.notes[0].content = "![image](attachment://missing)";
    expect(() => validateBackup(raw)).toThrow(/附件/);
  });

  it("rejects folder cycles", () => {
    const raw = fixture();
    raw.data.folders = [
      { id: "a", name: "a", createdAt: 1, parentId: "b" },
      { id: "b", name: "b", createdAt: 1, parentId: "a" },
    ];
    expect(() => validateBackup(raw)).toThrow(/循环/);
  });

  it("rejects malformed Base64", () => {
    const raw = fixture();
    raw.data.files.push({
      id: "f",
      noteId: "n",
      fileName: "f.png",
      fileType: "image/png",
      dataBase64: "!!!!",
    });
    expect(() => validateBackup(raw)).toThrow(/Base64/);
  });

  it("accepts attachment and history records exported by the app", () => {
    const raw = fixture();
    raw.data.files.push({
      id: "f",
      noteId: "n",
      fileName: "f.png",
      fileType: "image/png",
      dataBase64: "AA==",
    });
    raw.data.notes[0].content = "![image](attachment://f)";
    raw.data.noteVersions.push({
      id: "v",
      noteId: "n",
      title: "t",
      content: "old",
      createdAt: 1,
      source: "restore",
    });
    expect(validateBackup(raw).data.files).toHaveLength(1);
  });

  it("rejects malformed messages and settings", () => {
    const raw = fixture();
    raw.data.aiChats.push({
      id: "chat",
      title: "t",
      createdAt: 1,
      updatedAt: 1,
      messages: [{ role: "executable", content: "bad", ts: 1 }],
    });
    expect(() => validateBackup(raw)).toThrow(/message.role/);
    raw.data.aiChats = [];
    raw.data.settings.push({ key: "settings", value: { expandedFolders: "wrong" } });
    expect(() => validateBackup(raw)).toThrow(/expandedFolders/);
  });

  it("rejects oversized text", () => {
    const raw = fixture();
    raw.data.notes[0].content = "x".repeat(BACKUP_LIMITS.textChars + 1);
    expect(() => validateBackup(raw)).toThrow(/content/);
  });
});
