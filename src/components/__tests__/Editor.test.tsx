import { fireEvent, render, screen } from "@testing-library/react";
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
