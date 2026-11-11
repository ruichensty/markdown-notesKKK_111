import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useEditorPosition } from "../useEditorPosition";

describe("editor position memory", () => {
  it("restores selection and scrolling after switching and clamps shorter content", async () => {
    const el = document.createElement("textarea");
    el.value = "0123456789";
    el.setSelectionRange(9, 9);
    const ref = { current: el };
    const { result, rerender } = renderHook(({ id }) => useEditorPosition(ref, id, true, false), { initialProps: { id: "position-test-a" } });
    await waitFor(() => expect(el.selectionStart).toBe(0));
    el.setSelectionRange(4, 8);
    el.scrollTop = 120;
    act(() => result.current());
    rerender({ id: "position-test-b" });
    await waitFor(() => expect(el.selectionStart).toBe(0));
    el.value = "012345";
    rerender({ id: "position-test-a" });
    await waitFor(() => expect(el.selectionStart).toBe(4));
    expect(el.selectionEnd).toBe(6);
    expect(el.scrollTop).toBe(120);
  });
});
