import { afterEach, describe, expect, it, vi } from "vitest";
import {
  configureLibraryStorage,
  resetLibraryStorage,
  idbGetNote,
  idbReplaceAllData,
} from "../libraryStorage";
import { indexedDbLibraryStorage } from "../indexedDbAdapter";
import type { LibrarySnapshot } from "../contract";
import { restoreBackup } from "../../utils/backup";

afterEach(() => resetLibraryStorage());

describe("replaceable storage boundary", () => {
  it("delegates existing exports to the configured adapter", async () => {
    const getNote = vi.fn().mockResolvedValue(undefined);
    const replaceLibrary = vi.fn().mockResolvedValue(undefined);
    configureLibraryStorage({ ...indexedDbLibraryStorage, getNote, replaceLibrary });
    await idbGetNote("file-note");
    expect(getNote).toHaveBeenCalledWith("file-note");
    const snapshot: LibrarySnapshot = {
      notes: [],
      folders: [],
      settings: [],
      templates: [],
      aiChats: [],
      files: [],
      noteVersions: [],
    };
    await idbReplaceAllData(snapshot);
    expect(replaceLibrary).toHaveBeenCalledWith(snapshot);
  });

  it("rejects invalid backup data before invoking replacement", async () => {
    const replaceLibrary = vi.fn();
    configureLibraryStorage({ ...indexedDbLibraryStorage, replaceLibrary });
    const file = {
      size: 32,
      text: async () =>
        JSON.stringify({
          format: "markdown-notes-backup",
          version: 2,
          exportedAt: 1,
          data: { notes: [null] },
        }),
    } as File;
    await expect(restoreBackup(file)).rejects.toThrow();
    expect(replaceLibrary).not.toHaveBeenCalled();
  });
});
