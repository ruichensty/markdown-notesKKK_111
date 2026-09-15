import { describe, it, expect } from "vitest";
import { diffNotes } from "../noteDiff";
import type { Note } from "@types";

function makeNote(id: string, updatedAt: number): Note {
  return {
    id,
    title: `Note ${id}`,
    content: "",
    createdAt: 0,
    updatedAt,
  };
}

describe("diffNotes", () => {
  it("无变化时返回空 diff", () => {
    const notes = [makeNote("a", 100)];
    const diff = diffNotes(notes, notes);
    expect(diff.added).toEqual([]);
    expect(diff.updated).toEqual([]);
    expect(diff.deleted).toEqual([]);
  });

  it("识别新增笔记", () => {
    const snapshot = [makeNote("a", 100), makeNote("b", 200)];
    const previous = [makeNote("a", 100)];
    const diff = diffNotes(snapshot, previous);
    expect(diff.added.map(n => n.id)).toEqual(["b"]);
    expect(diff.updated).toEqual([]);
    expect(diff.deleted).toEqual([]);
  });

  it("识别更新笔记（updatedAt 变化）", () => {
    const snapshot = [makeNote("a", 200)];
    const previous = [makeNote("a", 100)];
    const diff = diffNotes(snapshot, previous);
    expect(diff.added).toEqual([]);
    expect(diff.updated.map(n => n.id)).toEqual(["a"]);
    expect(diff.deleted).toEqual([]);
  });

  it("识别删除笔记", () => {
    const snapshot = [makeNote("a", 100)];
    const previous = [makeNote("a", 100), makeNote("b", 200)];
    const diff = diffNotes(snapshot, previous);
    expect(diff.added).toEqual([]);
    expect(diff.updated).toEqual([]);
    expect(diff.deleted.map(n => n.id)).toEqual(["b"]);
  });

  it("混合场景：同时新增、更新、删除", () => {
    const snapshot = [
      makeNote("a", 300),
      makeNote("b", 200),
      makeNote("c", 400),
    ];
    const previous = [
      makeNote("a", 100),
      makeNote("b", 200),
      makeNote("old", 50),
    ];
    const diff = diffNotes(snapshot, previous);
    expect(diff.added.map(n => n.id)).toEqual(["c"]);
    expect(diff.updated.map(n => n.id)).toEqual(["a"]);
    expect(diff.deleted.map(n => n.id)).toEqual(["old"]);
  });

  it("updatedAt 未变的同名笔记不算更新", () => {
    const snapshot = [makeNote("a", 100)];
    const previous = [{ ...makeNote("a", 100), title: "Renamed" }];
    const diff = diffNotes(snapshot, previous);
    expect(diff.updated).toEqual([]);
  });
});
