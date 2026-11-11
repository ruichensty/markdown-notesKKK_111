import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Editor from "../Editor";
import type { Note } from "@types";

function makeNote(id: string, content: string): Note {
  return {
    id,
    title: `笔记 ${id}`,
    content,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("Editor draft lifecycle", () => {
  it("locates the result after switching notes and does not reselect while typing", async () => {
    const onUpdate = vi.fn();
    const { rerender } = render(<Editor note={makeNote("1", "第一篇内容")} onUpdate={onUpdate} />);
    const next = makeNote("2", "第二篇\n目标在这里");
    const request = { noteId: "2", query: "目标", token: 2 };
    rerender(<Editor note={next} onUpdate={onUpdate} searchRequest={request} />);
    const textarea = screen.getByLabelText("Markdown 编辑器") as HTMLTextAreaElement;
    await waitFor(() => expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe("目标"));
    fireEvent.change(textarea, { target: { value: next.content + "继续输入" } });
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    rerender(<Editor note={{ ...next, content: textarea.value }} onUpdate={onUpdate} searchRequest={request} />);
    expect(textarea.selectionStart).toBe(textarea.value.length);
  });

  it("marks title edits dirty and clears draft state when a saved snapshot is accepted", () => {
    const dirty = vi.fn();
    const ref = { current: null } as React.RefObject<import("../Editor").EditorHandle | null>;
    render(<Editor ref={ref} note={makeNote("1", "正文")} onUpdate={vi.fn()} onDraftStateChange={dirty} />);
    fireEvent.change(screen.getByDisplayValue("笔记 1"), { target: { value: "新标题" } });
    expect(dirty).toHaveBeenLastCalledWith(true);
    act(() => ref.current?.acceptSavedSnapshot("新标题", "正文"));
    expect(dirty).toHaveBeenLastCalledWith(false);
  });
  it("reports unsaved input immediately before debounce", () => {
    const dirty = vi.fn();
    render(<Editor note={makeNote("1", "正文")} onUpdate={vi.fn()} onDraftStateChange={dirty} />);
    fireEvent.change(screen.getByLabelText("Markdown 编辑器"), { target: { value: "新正文" } });
    expect(dirty).toHaveBeenLastCalledWith(true);
  });

  it("locates a literal search match without treating punctuation as regex", async () => {
    render(<Editor note={makeNote("1", "前文\n查找 a+b 的位置")} onUpdate={vi.fn()}
      searchRequest={{ noteId: "1", query: "a+b", token: 1 }} />);
    const textarea = screen.getByLabelText("Markdown 编辑器") as HTMLTextAreaElement;
    await waitFor(() => expect(textarea.selectionStart).toBe(textarea.value.indexOf("a+b")));
    expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe("a+b");
  });
  it("flushes the previous dirty draft before switching notes", () => {
    const onUpdate = vi.fn();
    const { rerender } = render(<Editor note={makeNote("1", "旧内容")} onUpdate={onUpdate} />);

    fireEvent.change(screen.getByLabelText("Markdown 编辑器"), {
      target: { value: "尚未防抖保存的内容" },
    });
    rerender(<Editor note={makeNote("2", "第二篇")} onUpdate={onUpdate} />);

    expect(onUpdate).toHaveBeenCalledWith("1", {
      title: "笔记 1",
      content: "尚未防抖保存的内容",
    });
  });

  it("accepts a same-note external update when the local draft is clean", () => {
    const onUpdate = vi.fn();
    const { rerender } = render(<Editor note={makeNote("1", "旧内容")} onUpdate={onUpdate} />);

    rerender(<Editor note={{ ...makeNote("1", "外部更新"), updatedAt: 2 }} onUpdate={onUpdate} />);

    expect(screen.getByLabelText("Markdown 编辑器")).toHaveValue("外部更新");
  });

  it("does not overwrite a dirty draft with a same-note external update", () => {
    const onUpdate = vi.fn();
    const { rerender } = render(<Editor note={makeNote("1", "旧内容")} onUpdate={onUpdate} />);

    fireEvent.change(screen.getByLabelText("Markdown 编辑器"), {
      target: { value: "本地草稿" },
    });
    rerender(<Editor note={{ ...makeNote("1", "外部更新"), updatedAt: 2 }} onUpdate={onUpdate} />);

    expect(screen.getByLabelText("Markdown 编辑器")).toHaveValue("本地草稿");
  });
});
