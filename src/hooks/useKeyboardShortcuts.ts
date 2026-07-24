import { useEffect, useCallback, useRef } from "react";

type KeyboardShortcut = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: () => void;
  preventDefault?: boolean;
  allowInEditable?: boolean;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  });

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcutsRef.current) {
      const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const wantsModifier = shortcut.ctrlKey || shortcut.metaKey;
      const matchesModifier = !wantsModifier || event.ctrlKey || event.metaKey;
      const matchesShift = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey;
      const matchesAlt = shortcut.altKey === undefined || event.altKey === shortcut.altKey;

      if (
        matchesKey &&
        matchesModifier &&
        matchesShift &&
        matchesAlt &&
        (shortcut.allowInEditable || !isEditableTarget(event.target))
      ) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.handler();
        return;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
