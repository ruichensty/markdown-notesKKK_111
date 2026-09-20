import { describe, expect, it } from "vitest";
import { findOrphanedFileIds } from "../storageMaintenance";
import type { Note } from "@types";
import type { StoredFileRecord } from "../indexedDBStorage";

const now = 10_000;

function file(id: string, createdAt = 0): StoredFileRecord {
  return {
    id,
    noteId: "note-1",
    data: new ArrayBuffer(0),
    fileName: `${id}.png`,
    fileType: "image/png",
    size: 0,
    createdAt,
  };
}

function note(content: string, attachmentIds: string[] = []): Note {
  return {
    id: "note-1",
    title: "测试",
    content,
    createdAt: 1,
    updatedAt: 1,
    attachments: attachmentIds.map(id => ({
      id,
      fileName: `${id}.png`,
      fileType: "image/png",
      fileSize: 0,
      uploadedAt: 1,
    })),
  };
}

describe("storage maintenance", () => {
  it("keeps files referenced by attachment metadata or markdown", () => {
    const result = findOrphanedFileIds(
      [note("![图片](attachment://markdown-file)", ["metadata-file"])],
      [file("metadata-file"), file("markdown-file"), file("orphan")],
      null,
      now,
      1000
    );
    expect(result).toEqual(["orphan"]);
  });

  it("keeps the custom AI avatar file", () => {
    expect(findOrphanedFileIds([], [file("avatar")], "avatar", now, 1000)).toEqual([]);
  });

  it("does not delete recent unreferenced files", () => {
    expect(findOrphanedFileIds([], [file("recent", 9500)], null, now, 1000)).toEqual([]);
  });
});
