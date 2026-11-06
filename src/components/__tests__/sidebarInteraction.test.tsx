import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NoteList from "../NoteList";

function setup() {
  const deleted = vi.fn();
  const deleteFolder = vi.fn();
  const rename = vi.fn();
  render(<NoteList
    notes={[{ id: "n", title: "测试笔记", content: "正文", createdAt: 1, updatedAt: 1, folderIds: [] }]}
    activeNoteId="n" onNoteSelect={vi.fn()} onNewNote={vi.fn()} onNoteDelete={deleted}
    folders={[{ id: "f", name: "资料", parentId: null, createdAt: 1 }]}
    folderTree={[{ id: "f", name: "资料", parentId: null, createdAt: 1, children: [] }]}
    expandedFolders={[]} onExpandedFoldersChange={vi.fn()}
    createFolder={vi.fn()} deleteFolder={deleteFolder} updateFolder={rename}
  />);
  return { deleted, deleteFolder, rename };
}

describe("sidebar interactions", () => {
  it("confirms note deletion outside the scrolling sidebar and supports cancel", () => {
    const { deleted } = setup();
    fireEvent.click(screen.getByRole("button", { name: "删除笔记「测试笔记」" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.closest(".sidebar-folder-tree-root")).toBeNull();
    expect(deleted).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByText("取消"));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "删除笔记「测试笔记」" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByText("删除"));
    expect(deleted).toHaveBeenCalledExactlyOnceWith("n");
  });

  it("explains folder deletion before removing it", () => {
    const { deleteFolder } = setup();
    fireEvent.click(screen.getByTitle("删除"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/笔记会保留/)).toBeInTheDocument();
    expect(deleteFolder).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByText("删除"));
    expect(deleteFolder).toHaveBeenCalledExactlyOnceWith("f");
  });

  it("does not submit or navigate on Enter during Chinese composition", () => {
    const { rename } = setup();
    fireEvent.click(screen.getByTitle("重命名"));
    const input = screen.getByDisplayValue("资料");
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(rename).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "新资料" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(rename).toHaveBeenCalledExactlyOnceWith("f", { name: "新资料" });
  });
});
