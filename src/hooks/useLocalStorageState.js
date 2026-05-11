import { useEffect, useState } from "react";

export function useLocalStorageState(key, fallbackValue) {
  const [value, setValue] = useState(() => {
    try {
      const savedValue = localStorage.getItem(key);
      return savedValue ? JSON.parse(savedValue) : fallbackValue;
    } catch {
      return fallbackValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to persist "${key}" to localStorage:`, error);
    }
  }, [key, value]);

  return [value, setValue];
}
