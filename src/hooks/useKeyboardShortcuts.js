import { useEffect } from "react";

export function useKeyboardShortcuts({ undo, redo, lastSaved }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      if (event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      }

      if ((event.key === "z" && event.shiftKey) || event.key === "y") {
        event.preventDefault();
        redo();
      }

      if (event.key === "p") {
        event.preventDefault();
        window.print();
      }

      if (event.key === "s") {
        event.preventDefault();
        alert(`✅ Schedule auto-saved at ${lastSaved.toLocaleTimeString()}`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lastSaved, redo, undo]);
}
