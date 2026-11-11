import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NoteSearchResults } from "../NoteSearchResults";
import { searchNotes } from "@utils/noteSearch";

describe("search selection", () => {
  it("toggles selection without opening or deleting and announces selection", () => {
    const select = vi.fn();
    const open = vi.fn();
    const remove = vi.fn();
    render(<NoteSearchResults
      results={searchNotes([{ id: "n", title: "测试", content: "正文", createdAt: 1, updatedAt: 1 }], "测试", { scope: "all", dateRange: "all" })}
      query="测试" activeNoteId="n" selectionMode selectedIds={new Set(["n"])}
      onToggleSelect={select} onNoteSelect={open} onNoteDelete={remove}
    />);
    const button = screen.getByRole("button", { name: "取消选择「测试」" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: /删除/ })).toBeNull();
    fireEvent.click(button);
    expect(select).toHaveBeenCalledExactlyOnceWith("n");
    expect(open).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});
