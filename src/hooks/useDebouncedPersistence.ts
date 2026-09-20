import { useCallback, useEffect, useRef, useState } from "react";
import type { SaveStatus } from "@types";

export interface DebouncedPersistenceState {
  status: SaveStatus;
  error: Error | null;
  retry: () => void;
  clearError: () => void;
  flush: () => Promise<boolean>;
  skipNextPersist: () => void;
}

export function useDebouncedPersistence<T>(
  value: T,
  save: (value: T) => Promise<void>,
  enabled: boolean,
  delay = 300
): DebouncedPersistenceState {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<Error | null>(null);
  const latestValueRef = useRef(value);
  const saveRef = useRef(save);
  const enabledRef = useRef(enabled);
  const timerRef = useRef(0);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(true);
  const skipNextPersistRef = useRef(false);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const persist = useCallback(async (retrying: boolean, reportState: boolean): Promise<boolean> => {
    if (!enabledRef.current) return false;
    window.clearTimeout(timerRef.current);
    timerRef.current = 0;
    const snapshot = latestValueRef.current;
    if (reportState && mountedRef.current) {
      setStatus(retrying ? "retrying" : "saving");
      setError(null);
    }

    const task = queueRef.current.catch(() => {}).then(() => saveRef.current(snapshot));
    queueRef.current = task;
    try {
      await task;
      if (reportState && mountedRef.current) setStatus("saved");
      return true;
    } catch (reason) {
      const nextError = reason instanceof Error ? reason : new Error(String(reason));
      if (reportState && mountedRef.current) {
        setError(nextError);
        setStatus("error");
      }
      return false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void persist(false, true);
    }, delay);
    return () => window.clearTimeout(timerRef.current);
  }, [delay, enabled, persist, value]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      window.clearTimeout(timerRef.current);
      if (enabledRef.current) void persist(false, false);
    };
  }, [persist]);

  const retry = useCallback(() => {
    void persist(true, true);
  }, [persist]);

  const clearError = useCallback(() => {
    setError(null);
    setStatus("saved");
  }, []);

  const flush = useCallback(() => persist(false, true), [persist]);
  const skipNextPersist = useCallback(() => {
    skipNextPersistRef.current = true;
  }, []);

  return { status, error, retry, clearError, flush, skipNextPersist };
}
