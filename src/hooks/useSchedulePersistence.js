import { useEffect, useRef, useState } from "react";

export function useSchedulePersistence({
  storageKey,
  payload,
  onRestore,
  isRestorable = (parsed) => Boolean(parsed),
  debounceMs = 500,
}) {
  const [lastSaved, setLastSaved] = useState(() => new Date());
  const [saveStatus, setSaveStatus] = useState("saved");
  const hydratedRef = useRef(false);
  const saveTimeoutRef = useRef(null);
  const statusTimeoutRef = useRef(null);
  const onRestoreRef = useRef(onRestore);
  const isRestorableRef = useRef(isRestorable);

  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    isRestorableRef.current = isRestorable;
  }, [isRestorable]);

  useEffect(() => {
    try {
      const savedState = localStorage.getItem(storageKey);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (isRestorableRef.current(parsed)) {
          onRestoreRef.current(parsed);
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
  }, [storageKey]);

  useEffect(() => {
    if (!hydratedRef.current) return undefined;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus("saving");

    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(payload));
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
  }, [debounceMs, payload, storageKey]);

  return { lastSaved, saveStatus };
}
