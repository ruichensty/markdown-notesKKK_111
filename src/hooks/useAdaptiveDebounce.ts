import { useState, useEffect, useRef } from "react";

export function useAdaptiveDebounce<T>(
  value: T,
  fastDelay = 150,
  busyDelay = 600,
  busyWindow = 1200
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const lastCommitRef = useRef(0);

  useEffect(() => {
    if (Object.is(value, debouncedValue)) return;

    const elapsed = Date.now() - lastCommitRef.current;
    const delay = elapsed < busyWindow ? busyDelay : fastDelay;
    const timer = window.setTimeout(() => {
      lastCommitRef.current = Date.now();
      setDebouncedValue(value);
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value, debouncedValue, fastDelay, busyDelay, busyWindow]);

  return debouncedValue;
}
