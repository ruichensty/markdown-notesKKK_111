import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/storage/libraryStorage", () => ({ idbGetNoteVersions: mocks.load }));
import { NoteHistoryDialog } from "../NoteHistoryDialog";

describe("history loading", () => {
  beforeEach(() => vi.clearAllMocks());
  const note = { id: "n", title: "笔记", content: "正文", createdAt: 1, updatedAt: 1 };
  const handlers = { onClose: vi.fn(), onRestore: vi.fn(), onDeleteVersion: vi.fn() };

  it("keeps history loaded when the current note content changes", async () => {
    mocks.load.mockResolvedValue([]);
    const { rerender } = render(<NoteHistoryDialog open note={note} {...handlers} />);
    await waitFor(() => expect(mocks.load).toHaveBeenCalledOnce());
    rerender(<NoteHistoryDialog open note={{ ...note, content: "修改后的正文" }} {...handlers} />);
    await waitFor(() => expect(screen.getByText(/继续编辑后/)).toBeInTheDocument());
    expect(mocks.load).toHaveBeenCalledOnce();
  });

  it("shows storage read failures", async () => {
    mocks.load.mockRejectedValue(new Error("历史读取失败"));
    render(<NoteHistoryDialog open note={note} {...handlers} />);
    expect(await screen.findByText("历史读取失败")).toBeInTheDocument();
  });

  it("keeps history open and displays failure when restoring cannot be saved", async () => {
    mocks.load.mockResolvedValue([{ id: "v", noteId: "n", title: "旧标题", content: "旧正文", createdAt: 1, source: "auto" }]);
    const restore = vi.fn().mockRejectedValue(new Error("恢复写入失败"));
    render(<NoteHistoryDialog open note={note} {...handlers} onRestore={restore} />);
    fireEvent.click(await screen.findByText("恢复此版本"));
    fireEvent.click(screen.getByText("确认恢复"));
    expect(await screen.findByText("恢复写入失败")).toBeInTheDocument();
    expect(handlers.onClose).not.toHaveBeenCalled();
    expect(screen.getByText("旧正文", { selector: "pre" })).toBeInTheDocument();
  });
});
