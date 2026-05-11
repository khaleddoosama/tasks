import { useCallback, useRef, useState } from "react";

export function useUndoRedo(initialState, maxHistory = 30) {
  const [state, setState] = useState(initialState);
  const historyRef = useRef([initialState]);
  const pointerRef = useRef(0);

  const set = useCallback(
    (updater) => {
      setState((currentState) => {
        const nextState = typeof updater === "function" ? updater(currentState) : updater;
        const nextHistory = historyRef.current.slice(0, pointerRef.current + 1);

        nextHistory.push(nextState);
        if (nextHistory.length > maxHistory) {
          nextHistory.shift();
        }

        historyRef.current = nextHistory;
        pointerRef.current = nextHistory.length - 1;

        return nextState;
      });
    },
    [maxHistory],
  );

  const replace = useCallback((nextState) => {
    historyRef.current = [nextState];
    pointerRef.current = 0;
    setState(nextState);
  }, []);

  const undo = useCallback(() => {
    if (pointerRef.current === 0) return;

    pointerRef.current -= 1;
    setState(historyRef.current[pointerRef.current]);
  }, []);

  const redo = useCallback(() => {
    if (pointerRef.current >= historyRef.current.length - 1) return;

    pointerRef.current += 1;
    setState(historyRef.current[pointerRef.current]);
  }, []);

  return [
    state,
    set,
    {
      undo,
      redo,
      replace,
      canUndo: pointerRef.current > 0,
      canRedo: pointerRef.current < historyRef.current.length - 1,
    },
  ];
}
