import { describe, expect, it } from "vitest";
import { extractNoteMetadata, searchNotes } from "../noteSearch";
import type { Note } from "@types";

function note(id: string, title: string, content: string, updatedAt = 100): Note {
  return { id, title, content, createdAt: 1, updatedAt };
}

describe("note metadata", () => {
  it("extracts unique tags and wiki links without treating headings as tags", () => {
    expect(extractNoteMetadata("# 标题\n#项目 #项目 #todo\n链接 [[另一篇]] 和 [[另一篇]]")).toEqual(
      {
        tags: ["项目", "todo"],
        wikiLinks: ["另一篇"],
      }
    );
  });
});

describe("ranked note search", () => {
  const notes = [
    note("1", "React 性能", "一些正文 #前端", 100),
    note("2", "普通笔记", "这里讨论 React 性能优化 #开发", 200),
    note("3", "过期内容", "React", 1),
  ];

  it("ranks title matches above content matches", () => {
    const results = searchNotes(notes, "react", { scope: "all", dateRange: "all", now: 300 });
    expect(results.map(result => result.note.id)).toEqual(["1", "2", "3"]);
    expect(results[0].matchedFields).toContain("title");
  });

  it("supports tag-only and date-range filtering", () => {
    expect(
      searchNotes(notes, "开发", { scope: "tags", dateRange: "all", now: 300 }).map(
        result => result.note.id
      )
    ).toEqual(["2"]);
    expect(
      searchNotes(notes, "react", { scope: "all", dateRange: "7d", now: 8 * 24 * 60 * 60 * 1000 })
    ).toEqual([]);
  });

  it("requires every search term to match", () => {
    const results = searchNotes(notes, "react 性能", { scope: "all", dateRange: "all", now: 300 });
    expect(results.map(result => result.note.id)).toEqual(["1", "2"]);
  });
});
