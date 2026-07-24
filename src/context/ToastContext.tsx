import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  leaving?: boolean;
  action?: ToastAction;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number, action?: ToastAction) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    const autoTimer = timersRef.current.get(id);
    if (autoTimer) {
      clearTimeout(autoTimer);
      timersRef.current.delete(id);
    }
    const leaveTimer = timersRef.current.get(id + "_leave");
    if (leaveTimer) {
      clearTimeout(leaveTimer);
      timersRef.current.delete(id + "_leave");
    }
  }, []);

  const hideToast = useCallback(
    (id: string) => {
      setToasts(prev => prev.map(toast => (toast.id === id ? { ...toast, leaving: true } : toast)));
      const timer = setTimeout(() => removeToast(id), 400);
      timersRef.current.set(id + "_leave", timer);
    },
    [removeToast]
  );

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration: number = 3000, action?: ToastAction) => {
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 11);
      const effectiveDuration = action && duration === 3000 ? 5000 : duration;
      const toast: Toast = { id, message, type, duration: effectiveDuration, action };

      setToasts(prev => [...prev, toast]);

      if (effectiveDuration > 0) {
        const timer = setTimeout(() => {
          hideToast(id);
        }, effectiveDuration);
        timersRef.current.set(id, timer);
      }
    },
    [hideToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const { toasts, hideToast } = useToast();

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast-card px-4 py-3 min-w-[280px] ${
            toast.leaving ? "toast-card--leaving" : ""
          } toast-card--${toast.type}`}
          role={toast.type === "error" ? "alert" : "status"}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex-1 text-sm text-foreground">{toast.message}</span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action?.onClick();
                  hideToast(toast.id);
                }}
                className="shrink-0 text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-1.5 py-0.5 rounded"
              >
                {toast.action.label}
              </button>
            )}
            <button
              onClick={() => hideToast(toast.id)}
              className="shrink-0 text-muted-foreground/60 hover:text-foreground transition-colors p-0.5 rounded"
              aria-label="关闭"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
