import { describe, expect, it } from "vitest";
import {
  NOTE_VERSION_INTERVAL_MS,
  createNoteVersion,
  selectNoteVersionIdsToPrune,
  hasMeaningfulNoteChange,
  shouldCreateAutoVersion,
} from "../noteVersion";
import type { Note } from "@types";

const note: Note = {
  id: "note-1",
  title: "标题",
  content: "正文",
  createdAt: 1,
  updatedAt: 1,
};

describe("note version policy", () => {
  it("detects title and content changes but ignores timestamps", () => {
    expect(hasMeaningfulNoteChange(note, { ...note, updatedAt: 2 })).toBe(false);
    expect(hasMeaningfulNoteChange(note, { ...note, title: "新标题" })).toBe(true);
    expect(hasMeaningfulNoteChange(note, { ...note, content: "新正文" })).toBe(true);
  });

  it("allows the first snapshot and throttles subsequent snapshots", () => {
    expect(shouldCreateAutoVersion(null, 100)).toBe(true);
    expect(shouldCreateAutoVersion(100, 100 + NOTE_VERSION_INTERVAL_MS - 1)).toBe(false);
    expect(shouldCreateAutoVersion(100, 100 + NOTE_VERSION_INTERVAL_MS)).toBe(true);
  });

  it("creates a standalone immutable snapshot", () => {
    const version = createNoteVersion(note, "manual", 123);
    expect(version).toMatchObject({
      noteId: note.id,
      title: note.title,
      content: note.content,
      createdAt: 123,
    });
    expect(version.id).toContain("note-1:123:");
  });

  it("prunes versions beyond the count limit", () => {
    const versions = [1, 2, 3].map(createdAt =>
      createNoteVersion({ ...note, content: String(createdAt) }, "auto", createdAt)
    );
    expect(selectNoteVersionIdsToPrune(versions, 2, 1000)).toEqual([versions[0].id]);
  });

  it("prunes older versions when the byte budget is exhausted", () => {
    const versions = [1, 2, 3].map(createdAt =>
      createNoteVersion({ ...note, content: "中".repeat(20) }, "auto", createdAt)
    );
    const result = selectNoteVersionIdsToPrune(versions, 50, 100);
    expect(result).toHaveLength(2);
    expect(result).not.toContain(versions[2].id);
  });

  it("always keeps the newest version even when it exceeds the byte budget", () => {
    const newest = createNoteVersion({ ...note, content: "x".repeat(1000) }, "auto", 2);
    const older = createNoteVersion(note, "auto", 1);
    expect(selectNoteVersionIdsToPrune([older, newest], 50, 10)).toEqual([older.id]);
  });
});
