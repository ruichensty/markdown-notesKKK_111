import { useEffect, useRef } from "react";

export function useUnsavedChangesGuard(hasUnsavedChanges: () => boolean) {
  const checkRef = useRef(hasUnsavedChanges);
  useEffect(() => {
    checkRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!checkRef.current()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
}
