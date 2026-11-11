import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useUnsavedChangesGuard } from "../useUnsavedChangesGuard";

function attemptClose() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe("unsaved changes guard", () => {
  it("checks the latest editor draft when closing, before debounce runs", () => {
    let draft = "saved";
    const { unmount } = renderHook(() => useUnsavedChangesGuard(() => draft !== "saved"));
    expect(attemptClose()).toBe(false);
    draft = "typing";
    expect(attemptClose()).toBe(true);
    draft = "saved";
    expect(attemptClose()).toBe(false);
    unmount();
  });

  it("uses updated save state and removes the listener on unmount", () => {
    const { rerender, unmount } = renderHook(
      ({ failed }) => useUnsavedChangesGuard(() => failed),
      { initialProps: { failed: true } }
    );
    expect(attemptClose()).toBe(true);
    rerender({ failed: false });
    expect(attemptClose()).toBe(false);
    unmount();
    expect(attemptClose()).toBe(false);
  });

  it("does not try asynchronous saving during unload", () => {
    const check = vi.fn(() => true);
    const { unmount } = renderHook(() => useUnsavedChangesGuard(check));
    expect(attemptClose()).toBe(true);
    expect(check).toHaveBeenCalledOnce();
    unmount();
  });
});
