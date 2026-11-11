import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrashView from "../TrashView";

describe("trash restore feedback", () => {
  it("blocks repeated restore and offers retry even when the note leaves trash", async () => {
    let reject!: (reason: Error) => void;
    const restore = vi.fn(() => new Promise<void>((_, fail) => { reject = fail; }));
    const close = vi.fn();
    const note = { id: "n", title: "待恢复", content: "正文", createdAt: 1, updatedAt: 1, deletedAt: 2 };
    const props = { open: true, onClose: close, onRestore: restore, onPurge: vi.fn(), onEmptyTrash: vi.fn() };
    const { rerender } = render(<TrashView {...props} notes={[note]} />);
    fireEvent.click(screen.getByTitle("恢复"));
    fireEvent.click(screen.getByTitle("恢复"));
    fireEvent.click(screen.getByLabelText("关闭"));
    expect(restore).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByText("恢复中…")).toBeInTheDocument();
    rerender(<TrashView {...props} notes={[]} />);
    await act(async () => reject(new Error("写入失败")));
    expect(screen.getByRole("alert")).toHaveTextContent("写入失败");
    fireEvent.click(screen.getByText("重试恢复保存"));
    expect(restore).toHaveBeenCalledTimes(2);
    await act(async () => reject(new Error("仍失败")));
  });
});
