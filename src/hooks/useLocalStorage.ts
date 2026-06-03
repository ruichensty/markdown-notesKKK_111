import { useState, useEffect, useCallback } from "react";

interface UseLocalStorageOptions<T> {
  defaultValue: T;
  key: string;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
}

export function useLocalStorage<T>({
  defaultValue,
  key,
  serialize = JSON.stringify,
  deserialize = JSON.parse,
}: UseLocalStorageOptions<T>) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? deserialize(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setStoredValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      try {
        setValue(prev => {
          const valueToStore =
            typeof newValue === "function" ? (newValue as (prev: T) => T)(prev) : newValue;
          window.localStorage.setItem(key, serialize(valueToStore));
          return valueToStore;
        });
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, serialize]
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setValue(defaultValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, defaultValue]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setValue(deserialize(event.newValue));
        } catch (error) {
          console.error(`Error deserializing localStorage change:`, error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key, deserialize]);

  return [value, setStoredValue, removeValue] as const;
}
