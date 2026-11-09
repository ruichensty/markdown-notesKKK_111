import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "../../types/note";

const mocks = vi.hoisted(() => ({
  loadNotes: vi.fn(),
  loadSingleNote: vi.fn(),
  saveSingleNote: vi.fn(),
  deleteSingleNote: vi.fn(),
  subscribe: vi.fn(),
  invalidate: vi.fn(),
  getVersions: vi.fn(),
}));
vi.mock("@utils/storage", () => ({
  loadNotes: mocks.loadNotes,
  loadSingleNote: mocks.loadSingleNote,
  saveSingleNote: mocks.saveSingleNote,
  deleteSingleNote: mocks.deleteSingleNote,
  invalidateAllDataCache: mocks.invalidate,
}));
vi.mock("@/storage/libraryStorage", () => ({
  idbGetNoteVersions: mocks.getVersions,
  idbSaveNoteVersion: vi.fn(),
  idbPruneNoteVersions: vi.fn(),
  idbDeleteNoteVersion: vi.fn(),
  idbPurgeNotes: vi.fn(),
}));
vi.mock("@utils/crossTabSync", () => ({
  subscribeCrossTabChange: mocks.subscribe,
  publishCrossTabChange: vi.fn(),
}));
import { useNotes } from "../useNotes";

const base: Note = { id: "1", title: "title", content: "initial", createdAt: 1, updatedAt: 1 };

describe("useNotes persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadNotes.mockResolvedValue([base]);
    mocks.loadSingleNote.mockResolvedValue(base);
    mocks.saveSingleNote.mockResolvedValue(undefined);
    mocks.getVersions.mockResolvedValue([]);
    mocks.subscribe.mockReturnValue(() => {});
  });

  it("keeps the newer edit after an earlier save completes", async () => {
    let release!: () => void;
    let stored = base;
    mocks.loadSingleNote.mockImplementation(async () => stored);
    mocks.saveSingleNote
      .mockImplementationOnce(
        (note: Note) =>
          new Promise<void>(resolve => {
            release = () => {
              stored = note;
              resolve();
            };
          })
      )
      .mockImplementation(async (note: Note) => {
        stored = note;
      });
    const { result } = renderHook(() => useNotes(null, false));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    act(() => result.current.updateNote("1", { content: "first" }));
    let first!: Promise<boolean>;
    act(() => {
      first = result.current.saveNow();
    });
    await waitFor(() => expect(mocks.saveSingleNote).toHaveBeenCalledTimes(1));
    act(() => result.current.updateNote("1", { content: "second" }));
    release();
    await act(async () => {
      await first;
    });
    expect(result.current.saveStatus).toBe("dirty");
    await act(async () => {
      await result.current.saveNow();
    });
    expect(mocks.saveSingleNote).toHaveBeenCalledTimes(2);
    expect(mocks.saveSingleNote.mock.calls[1][0].content).toBe("second");
  });

  it("preserves a pending draft when another tab updates the same note", async () => {
    const { result } = renderHook(() => useNotes(null, false));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    act(() => result.current.updateNote("1", { content: "local" }));
    const remote = { ...base, content: "remote", updatedAt: 99 };
    mocks.loadNotes.mockResolvedValue([remote]);
    mocks.loadSingleNote.mockResolvedValue(remote);
    await act(async () => {
      mocks.subscribe.mock.calls.find(call => call[0] === "notes")![1]();
    });
    await waitFor(() => expect(mocks.loadNotes).toHaveBeenCalledTimes(2));
    expect(result.current.currentNote?.content).toBe("local");
    let failure: unknown;
    await act(async () => {
      try {
        await result.current.saveNow();
      } catch (error) {
        failure = error;
      }
    });
    expect(failure).toBeInstanceOf(Error);
    expect(mocks.saveSingleNote).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.saveStatus).toBe("error"));
    expect(result.current.conflictNoteId).toBe(base.id);
    await act(async () => {
      await result.current.resolveConflict(true);
    });
    expect(result.current.conflictNoteId).toBeNull();
    expect(result.current.allNotes.find(note => note.id === base.id)?.content).toBe("remote");
    const copy = result.current.allNotes.find(note => note.id !== base.id);
    expect(copy?.content).toBe("local");
    expect(copy?.title).toContain("冲突副本");
    expect(mocks.saveSingleNote.mock.calls[0][0].id).not.toBe(base.id);
  });

  it("does not enable editing after an initial read failure and can retry", async () => {
    mocks.loadNotes.mockRejectedValueOnce(new Error("read failed")).mockResolvedValueOnce([base]);
    const { result } = renderHook(() => useNotes(null, false));
    await waitFor(() => expect(result.current.loadError).toBe(true));
    expect(result.current.loaded).toBe(false);
    await act(async () => {
      await result.current.retryLoad();
    });
    expect(result.current.loaded).toBe(true);
    expect(result.current.currentNote?.content).toBe("initial");
  });

  it("does not repeat a completed write when retrying a partially failed batch", async () => {
    const stored = new Map<string, Note>([[base.id, base]]);
    mocks.loadSingleNote.mockImplementation(async (id: string) => stored.get(id));
    mocks.saveSingleNote.mockImplementation(async (note: Note) => {
      if (note.id === "1") throw new Error("disk full");
      stored.set(note.id, note);
    });
    const { result } = renderHook(() => useNotes(null, false));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    act(() => {
      result.current.updateNote("1", { content: "saved once" });
      result.current.createNote({ title: "second", content: "new" });
    });
    let failure: unknown;
    await act(async () => {
      try {
        await result.current.saveNow();
      } catch (error) {
        failure = error;
      }
    });
    expect(failure).toBeInstanceOf(Error);
    expect(mocks.saveSingleNote.mock.calls.filter(call => call[0].id !== "1")).toHaveLength(1);
    mocks.saveSingleNote.mockImplementation(async (note: Note) => {
      stored.set(note.id, note);
    });
    await act(async () => {
      await result.current.saveNow();
    });
    expect(mocks.saveSingleNote.mock.calls.filter(call => call[0].id !== "1")).toHaveLength(1);
    expect(stored.size).toBe(2);
  }, 30000);
});
