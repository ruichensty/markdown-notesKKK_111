import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "../../types/note";

import { invalidateAllDataCache, loadAllData } from "../indexedDBStorage";

describe("storage loading", () => {
  beforeEach(() => {
    invalidateAllDataCache();
    vi.unstubAllGlobals();
  });

  it("retries after a transient read failure", async () => {
    const notes: Note[] = [{ id: "1", title: "saved", content: "", createdAt: 1, updatedAt: 1 }];
    let reads = 0;
    const db = {
      onclose: null,
      onversionchange: null,
      transaction: (store: string) => {
        const transaction: {
          oncomplete?: () => void;
          onerror?: () => void;
          onabort?: () => void;
          error: Error | null;
        } = { error: null };
        return Object.assign(transaction, {
          objectStore: () => ({
            getAll: () => request(store === "notes" ? ++reads === 1 ? new Error("temporary") : notes : [] , transaction),
            get: () => request(undefined, transaction),
          }),
        });
      },
    };
    function request(value: unknown, transaction: { oncomplete?: () => void; onerror?: () => void; error: Error | null }) {
      const req: { result?: unknown; error: Error | null; onsuccess?: () => void; onerror?: () => void } = {
        error: value instanceof Error ? value : null,
        result: value instanceof Error ? undefined : value,
      };
      queueMicrotask(() => {
        if (req.error) req.onerror?.();
        else { req.onsuccess?.(); transaction.oncomplete?.(); }
      });
      return req;
    }
    vi.stubGlobal("indexedDB", { open: () => {
      const openRequest: { result: typeof db; onsuccess?: () => void } = { result: db };
      queueMicrotask(() => openRequest.onsuccess?.());
      return openRequest;
    } });
    await expect(loadAllData()).rejects.toThrow("temporary");
    await expect(loadAllData()).resolves.toMatchObject({ notes });
    expect(reads).toBe(2);
  });
});
