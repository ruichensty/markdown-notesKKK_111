import { describe, expect, it } from "vitest";
import {
  buildAiNoteApplyPreview,
  buildAiNoteContext,
  deriveAiNoteTitle,
  getMarkdownSectionRange,
} from "../aiNoteActions";
import type { AiEditorSnapshot } from "@types";

const snapshot: AiEditorSnapshot = {
  noteId: "note-1",
  title: "测试笔记",
  content: "# 第一章\n开头\n## 小节\n内容\n# 第二章\n结尾",
  selectionStart: 18,
  selectionEnd: 20,
};

describe("AI note context", () => {
  it("extracts the selected text exactly", () => {
    const result = buildAiNoteContext(snapshot, "selection");
    expect(result?.content).toBe(snapshot.content.slice(18, 20));
    expect(result?.label).toBe("当前选区");
  });

  it("returns null for an empty selection", () => {
    expect(
      buildAiNoteContext({ ...snapshot, selectionStart: 3, selectionEnd: 3 }, "selection")
    ).toBeNull();
  });

  it("keeps child headings inside the active markdown section", () => {
    const range = getMarkdownSectionRange(snapshot.content, 8);
    expect(snapshot.content.slice(range.start, range.end)).toBe("# 第一章\n开头\n## 小节\n内容\n");
  });

  it("truncates transmitted content while retaining source length", () => {
    const result = buildAiNoteContext({ ...snapshot, content: "a".repeat(20) }, "full", 10);
    expect(result).toMatchObject({ totalChars: 20, sentChars: 10, truncated: true });
    expect(result?.content).toContain("已截断");
  });
});

describe("AI note apply previews", () => {
  it("appends markdown using a blank-line separator", () => {
    const result = buildAiNoteApplyPreview(snapshot, "append", "新增内容");
    expect(result?.afterContent).toBe(`${snapshot.content}\n\n新增内容`);
  });

  it("replaces only the current selection", () => {
    const result = buildAiNoteApplyPreview(snapshot, "replace-selection", "替换");
    expect(result?.afterContent).toBe(
      snapshot.content.slice(0, 18) + "替换" + snapshot.content.slice(20)
    );
  });

  it("requires a non-empty selection for replacement", () => {
    expect(
      buildAiNoteApplyPreview(
        { ...snapshot, selectionStart: 4, selectionEnd: 4 },
        "replace-selection",
        "替换"
      )
    ).toBeNull();
  });

  it("derives a new note title from a markdown heading", () => {
    expect(deriveAiNoteTitle("# 新标题\n正文")).toBe("新标题");
  });
});
