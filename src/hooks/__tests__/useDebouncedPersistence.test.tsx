import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedPersistence } from "../useDebouncedPersistence";

describe("browser lifecycle persistence", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("saves the latest pending value when the page becomes hidden", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { rerender, unmount } = renderHook(
      ({ value }) => useDebouncedPersistence(value, save, true),
      { initialProps: { value: "old" } }
    );
    rerender({ value: "latest" });
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(save).toHaveBeenCalledExactlyOnceWith("latest");
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(save).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("flushes pending changes on pagehide without a visibility event", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() => useDebouncedPersistence("latest", save, true));
    await act(async () => window.dispatchEvent(new Event("pagehide")));
    expect(save).toHaveBeenCalledExactlyOnceWith("latest");
    unmount();
  });

  it("does not write before stored data has loaded", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() => useDebouncedPersistence("default", save, false));
    await act(async () => window.dispatchEvent(new Event("pagehide")));
    expect(save).not.toHaveBeenCalled();
    unmount();
  });
});
