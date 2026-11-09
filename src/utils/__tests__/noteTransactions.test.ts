import { describe, expect, it, vi } from "vitest";
import type { Note } from "../../types/note";

const base: Note = { id: "1", title: "title", content: "old", createdAt: 1, updatedAt: 1 };

describe("note transaction safety", () => {
  it("aborts a restore when a synchronous put fails after clear", async () => {
    vi.resetModules();
    const abort = vi.fn();
    const clear = vi.fn(() => ({}));
    const transaction = {
      abort,
      objectStore: () => ({
        clear,
        put: () => {
          throw new Error("invalid record");
        },
      }),
    };
    vi.stubGlobal("indexedDB", {
      open: () => {
        const request = {
          result: { transaction: () => transaction },
          onsuccess: null as null | (() => void),
        };
        queueMicrotask(() => request.onsuccess?.());
        return request;
      },
    });
    try {
      const { idbReplaceAllData } = await import("../indexedDBStorage");
      await expect(
        idbReplaceAllData({
          notes: [base],
          folders: [],
          settings: [],
          templates: [],
          aiChats: [],
          files: [],
          noteVersions: [],
        })
      ).rejects.toThrow("invalid record");
      expect(clear).toHaveBeenCalled();
      expect(abort).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects a stale baseline inside the write transaction without putting", async () => {
    vi.resetModules();
    const put = vi.fn();
    const transaction = {
      onabort: null as null | (() => void),
      oncomplete: null as null | (() => void),
      error: null,
      abort: () => queueMicrotask(() => transaction.onabort?.()),
      objectStore: () => ({
        put,
        get: () => {
          const request = {
            result: { ...base, content: "remote", updatedAt: 2 },
            onsuccess: null as null | (() => void),
          };
          queueMicrotask(() => request.onsuccess?.());
          return request;
        },
      }),
    };
    vi.stubGlobal("indexedDB", {
      open: () => {
        const request = {
          result: { transaction: () => transaction },
          onsuccess: null as null | (() => void),
        };
        queueMicrotask(() => request.onsuccess?.());
        return request;
      },
    });
    try {
      const { idbCompareAndWriteNote } = await import("../indexedDBStorage");
      await expect(
        idbCompareAndWriteNote(base.id, base, { ...base, content: "local" })
      ).rejects.toMatchObject({ name: "NoteConflictError", noteId: "1" });
      expect(put).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
