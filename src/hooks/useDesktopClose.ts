import { useEffect, useRef } from "react";
import { isTauri } from "@tauri-apps/api/core";

export function useDesktopClose(
  saveBeforeClose: () => Promise<void>,
  onError: (error: unknown) => void
) {
  const handlers = useRef({ saveBeforeClose, onError });
  useEffect(() => {
    handlers.current = { saveBeforeClose, onError };
  }, [saveBeforeClose, onError]);

  useEffect(() => {
    if (!isTauri()) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    let closing = false;
    void import("@tauri-apps/api/window")
      .then(async ({ getCurrentWindow }) => {
        if (disposed) return;
        const appWindow = getCurrentWindow();
        const stop = await appWindow.onCloseRequested(async event => {
          event.preventDefault();
          if (closing) return;
          closing = true;
          try {
            await handlers.current.saveBeforeClose();
            await appWindow.destroy();
          } catch (error) {
            handlers.current.onError(error);
          } finally {
            closing = false;
          }
        });
        if (disposed) stop();
        else unlisten = stop;
      })
      .catch(error => handlers.current.onError(error));
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
}
