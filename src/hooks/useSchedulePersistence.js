import { useEffect, useRef, useState } from "react";

export function useSchedulePersistence({ storageKey, days, colors, onRestore, debounceMs = 500 }) {
  const [lastSaved, setLastSaved] = useState(() => new Date());
  const [saveStatus, setSaveStatus] = useState("saved");
  const hydratedRef = useRef(false);
  const saveTimeoutRef = useRef(null);
  const statusTimeoutRef = useRef(null);

  useEffect(() => {
    try {
      const savedState = localStorage.getItem(storageKey);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed.days && Array.isArray(parsed.days)) {
          onRestore(parsed);
          setSaveStatus("loaded");
          statusTimeoutRef.current = setTimeout(() => setSaveStatus("saved"), 2000);
        }
      }
    } catch (error) {
      console.error("Load failed:", error);
    } finally {
      hydratedRef.current = true;
    }

    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, [onRestore, storageKey]);

  useEffect(() => {
    if (!hydratedRef.current) return undefined;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus("saving");

    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ days, colors }));
        setLastSaved(new Date());
        setSaveStatus("saved");
      } catch (error) {
        console.error("Save failed:", error);
        setSaveStatus("error");
        statusTimeoutRef.current = setTimeout(() => setSaveStatus("saved"), 3000);
      }
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [colors, days, debounceMs, storageKey]);

  return { lastSaved, saveStatus };
}
