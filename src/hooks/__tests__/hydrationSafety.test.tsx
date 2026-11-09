import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ readFolders: vi.fn(), readSettings: vi.fn(), write: vi.fn() }));
vi.mock("@/storage/libraryStorage", () => ({
  idbGetAllFolders: mocks.readFolders,
  idbGetSetting: mocks.readSettings,
  idbSaveAllFolders: mocks.write,
  idbSetSetting: mocks.write,
}));
vi.mock("@utils/storage", () => ({ getAllDataCache: () => null }));
vi.mock("@utils/crossTabSync", () => ({
  subscribeCrossTabChange: () => () => {},
  publishCrossTabChange: vi.fn(),
}));
import { useFolders } from "../useFolders";
import { useSettings } from "../useSettings";

describe("failed hydration must not overwrite stored data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.write.mockResolvedValue(undefined);
  });

  it("keeps folder writes disabled after a failed read and supports retry", async () => {
    mocks.readFolders
      .mockRejectedValueOnce(new Error("read failed"))
      .mockResolvedValue([{ id: "f", name: "saved", parentId: null, createdAt: 1 }]);
    const { result } = renderHook(() => useFolders());
    await waitFor(() => expect(result.current.loadError).toBe(true));
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });
    expect(result.current.loaded).toBe(false);
    expect(mocks.write).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.retryLoad();
    });
    expect(result.current.folders[0].name).toBe("saved");
    expect(result.current.loaded).toBe(true);
  });

  it("never writes default settings after a failed read", async () => {
    mocks.readSettings
      .mockRejectedValueOnce(new Error("read failed"))
      .mockResolvedValue({ fontSize: 24, aiApiKey: "stored-key" });
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.loadError).toBe(true));
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });
    expect(mocks.write).not.toHaveBeenCalled();
    expect(result.current.loaded).toBe(false);
    await act(async () => {
      await result.current.retryLoad();
    });
    expect(result.current.settings.fontSize).toBe(24);
    expect(result.current.loaded).toBe(true);
  });
});
