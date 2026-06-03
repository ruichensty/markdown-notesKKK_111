import { useCallback, useEffect, useState } from "react";

export interface StorageEstimateState {
  usage: number | null;
  quota: number | null;
  supported: boolean;
}

export function useStorageEstimate(refreshKey?: unknown): StorageEstimateState {
  const [state, setState] = useState<StorageEstimateState>({
    usage: null,
    quota: null,
    supported: typeof navigator !== "undefined" && Boolean(navigator.storage?.estimate),
  });

  const loadEstimate = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
      setState({ usage: null, quota: null, supported: false });
      return;
    }

    try {
      const estimate = await navigator.storage.estimate();
      setState({
        usage: estimate.usage ?? null,
        quota: estimate.quota ?? null,
        supported: true,
      });
    } catch {
      setState({ usage: null, quota: null, supported: false });
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEstimate();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadEstimate, refreshKey]);

  return state;
}
