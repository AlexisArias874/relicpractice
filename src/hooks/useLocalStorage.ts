import { useCallback, useEffect, useState } from 'react';

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable in private browsing; the app still works.
    }
  }, [key, value]);

  const update = useCallback((next: T | ((previous: T) => T)) => {
    setValue(next);
  }, []);

  return [value, update] as const;
}
