import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const native = vi.hoisted(() => ({
  listen: vi.fn(),
  destroy: vi.fn(),
  stop: vi.fn(),
}));
vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => true }));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ onCloseRequested: native.listen, destroy: native.destroy }),
}));
import { useDesktopClose } from "../useDesktopClose";

describe("desktop close save guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    native.listen.mockResolvedValue(native.stop);
    native.destroy.mockResolvedValue(undefined);
  });

  it("prevents immediate close and waits for save before destroying the window", async () => {
    let release!: () => void;
    const save = vi.fn(
      () =>
        new Promise<void>(resolve => {
          release = resolve;
        })
    );
    const onError = vi.fn();
    const { unmount } = renderHook(() => useDesktopClose(save, onError));
    await waitFor(() => expect(native.listen).toHaveBeenCalledOnce());
    const event = { preventDefault: vi.fn() };
    let closing!: Promise<void>;
    act(() => {
      closing = native.listen.mock.calls[0][0](event);
    });
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(native.destroy).not.toHaveBeenCalled();
    await act(async () => {
      release();
      await closing;
    });
    expect(native.destroy).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
    unmount();
    expect(native.stop).toHaveBeenCalledOnce();
  });

  it("leaves the window open when saving fails", async () => {
    const failure = new Error("disk full");
    const save = vi.fn().mockRejectedValue(failure);
    const onError = vi.fn();
    renderHook(() => useDesktopClose(save, onError));
    await waitFor(() => expect(native.listen).toHaveBeenCalledOnce());
    await act(async () => {
      await native.listen.mock.calls[0][0]({ preventDefault: vi.fn() });
    });
    expect(native.destroy).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(failure);
  });
});
