import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBackupReminder } from "../useBackupReminder";

describe("backup reminders", () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-11T00:00:00Z")); });
  afterEach(() => { vi.useRealTimers(); localStorage.clear(); });
  it("reminds after seven days and synchronizes confirmed exports", () => {
    const first = renderHook(() => useBackupReminder());
    const second = renderHook(() => useBackupReminder());
    expect(first.result.current.due).toBe(false);
    act(() => { vi.setSystemTime(Date.now() + 8 * 86400000); window.dispatchEvent(new Event("focus")); });
    expect(first.result.current.due).toBe(true);
    act(() => first.result.current.confirmExport());
    expect(second.result.current.confirmedAt).toBe(Date.now());
    expect(second.result.current.due).toBe(false);
    first.unmount(); second.unmount();
  });
  it("supports snoozing and disabling reminders", () => {
    const { result, unmount } = renderHook(() => useBackupReminder());
    act(() => { vi.setSystemTime(Date.now() + 8 * 86400000); window.dispatchEvent(new Event("focus")); });
    act(() => result.current.snooze());
    expect(result.current.due).toBe(false);
    act(() => { vi.setSystemTime(Date.now() + 2 * 86400000); window.dispatchEvent(new Event("focus")); });
    expect(result.current.due).toBe(true);
    act(() => result.current.setIntervalDays(0));
    expect(result.current.due).toBe(false);
    unmount();
  });
  it.each([1, 30])("handles the exact boundary for a %i day interval and persists it", interval => {
    const first = renderHook(() => useBackupReminder());
    act(() => first.result.current.setIntervalDays(interval));
    const since = first.result.current.since;
    act(() => { vi.setSystemTime(since + interval * 86400000 - 1); window.dispatchEvent(new Event("focus")); });
    expect(first.result.current.due).toBe(false);
    act(() => { vi.setSystemTime(since + interval * 86400000); window.dispatchEvent(new Event("focus")); });
    expect(first.result.current.due).toBe(true);
    first.unmount();
    const second = renderHook(() => useBackupReminder());
    expect(second.result.current.interval).toBe(interval);
    expect(second.result.current.due).toBe(true);
    second.unmount();
  });
});
