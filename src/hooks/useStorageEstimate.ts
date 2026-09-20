import { useCallback, useEffect, useState } from "react";

export interface StorageEstimateState {
  usage: number | null;
  quota: number | null;
  supported: boolean;
  persisted: boolean | null;
  persistenceSupported: boolean;
  requestPersistence: () => Promise<boolean>;
}

export function useStorageEstimate(refreshKey?: unknown): StorageEstimateState {
  const [state, setState] = useState<StorageEstimateState>({
    usage: null,
    quota: null,
    supported: typeof navigator !== "undefined" && Boolean(navigator.storage?.estimate),
    persisted: null,
    persistenceSupported:
      typeof navigator !== "undefined" &&
      typeof navigator.storage?.persisted === "function" &&
      typeof navigator.storage?.persist === "function",
    requestPersistence: async () => false,
  });

  const loadEstimate = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
      setState(prev => ({ ...prev, usage: null, quota: null, supported: false }));
      return;
    }

    try {
      const [estimate, persisted] = await Promise.all([
        navigator.storage.estimate(),
        navigator.storage.persisted?.() ?? Promise.resolve(false),
      ]);
      setState(prev => ({
        ...prev,
        usage: estimate.usage ?? null,
        quota: estimate.quota ?? null,
        supported: true,
        persisted,
      }));
    } catch {
      setState(prev => ({ ...prev, usage: null, quota: null, supported: false }));
    }
  }, []);

  const requestPersistence = useCallback(async (): Promise<boolean> => {
    if (!navigator.storage?.persist) return false;
    try {
      const persisted = await navigator.storage.persist();
      setState(prev => ({ ...prev, persisted }));
      return persisted;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEstimate();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadEstimate, refreshKey]);

  return { ...state, requestPersistence };
}
