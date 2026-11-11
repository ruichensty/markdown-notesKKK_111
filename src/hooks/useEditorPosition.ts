import { useCallback, useEffect, useRef, type RefObject } from "react";

interface Position {
  start: number;
  end: number;
  top: number;
  left: number;
}
const positions = new Map<string, Position>();
const key = "markdown-notes-editor-positions";

function readPositions() {
  try {
    const rows: unknown = JSON.parse(sessionStorage.getItem(key) || "[]");
    if (!Array.isArray(rows)) return;
    for (const row of rows.slice(-100)) {
      if (!Array.isArray(row) || typeof row[0] !== "string") continue;
      const p = row[1] as Position | undefined;
      if (p && [p.start, p.end, p.top, p.left].every(value => Number.isFinite(value) && value >= 0))
        positions.set(row[0], p);
    }
  } catch {
    return;
  }
}

export function useEditorPosition(
  ref: RefObject<HTMLTextAreaElement | null>,
  noteId: string,
  ready: boolean,
  searchPending: boolean
) {
  const restored = useRef<string | null>(null);
  const remember = useCallback(() => {
    const el = ref.current;
    if (!el || (restored.current !== null && restored.current !== noteId)) return;
    restored.current = noteId;
    positions.delete(noteId);
    positions.set(noteId, {
      start: el.selectionStart,
      end: el.selectionEnd,
      top: el.scrollTop,
      left: el.scrollLeft,
    });
    if (positions.size > 100) positions.delete(positions.keys().next().value!);
    try {
      sessionStorage.setItem(key, JSON.stringify([...positions]));
    } catch {
      return;
    }
  }, [noteId, ref]);

  useEffect(() => {
    if (!ready || restored.current === noteId) return;
    readPositions();
    const frame = requestAnimationFrame(() => {
      if (restored.current === noteId) return;
      const el = ref.current;
      if (!el) return;
      const saved = positions.get(noteId);
      if (!searchPending) {
        el.setSelectionRange(
          Math.min(saved?.start ?? 0, el.value.length),
          Math.min(saved?.end ?? 0, el.value.length)
        );
        el.scrollTop = saved?.top ?? 0;
        el.scrollLeft = saved?.left ?? 0;
      }
      restored.current = noteId;
    });
    return () => cancelAnimationFrame(frame);
  }, [noteId, ready, searchPending, ref]);
  return remember;
}
