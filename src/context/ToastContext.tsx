import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  leaving?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
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
    (message: string, type: ToastType = "info", duration: number = 3000) => {
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 11);
      const toast: Toast = { id, message, type, duration };

      setToasts(prev => [...prev, toast]);

      if (duration > 0) {
        const timer = setTimeout(() => {
          hideToast(id);
        }, duration);
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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg shadow-lg transform min-w-[300px] ${
            toast.leaving ? "animate-slide-out" : "animate-slide-in"
          } ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : toast.type === "error"
                ? "bg-red-600 text-white"
                : toast.type === "warning"
                  ? "bg-yellow-500 text-white"
                  : "bg-blue-600 text-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => hideToast(toast.id)}
              className="ml-3 text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
