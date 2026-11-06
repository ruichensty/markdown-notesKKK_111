import { describe, expect, it } from "vitest";
import { sameNotes } from "../noteListComparison";
import type { Note } from "../../types/note";

const note: Note = { id: "a", title: "Title", content: "# Old", createdAt: 1, updatedAt: 1 };

describe("note list comparison", () => {
  it("updates search and outline when the active note content changes", () => {
    expect(sameNotes([note], [{ ...note, content: "# New" }])).toBe(false);
  });

  it("skips unchanged notes", () => {
    expect(sameNotes([note], [note])).toBe(true);
  });
});
