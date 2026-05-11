import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGistSync } from "../../useGistSync";
import {
  DARK_MODE_KEY,
  DEFAULT_COLORS,
  DEFAULT_GOAL_TARGET,
  LS_KEY,
  WEEKLY_GOALS_KEY,
} from "../../domain/schedule/constants";
import { normalizeColors, normalizeDaysCategories } from "../../domain/schedule/categories";
import { buildCurrentWeekGoals, calcGoalHours, calculateGoalsSummary } from "../../domain/schedule/goals";
import { cloneTasksWithNewIds, getNextTaskIdSeed } from "../../domain/schedule/ids";
import { createInitialDays } from "../../domain/schedule/seedData";
import { formatDateDisplay, getCurrentWeekNumber, getWeekDates } from "../../domain/schedule/week";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useLocalStorageState } from "../../hooks/useLocalStorageState";
import { usePrintStyle } from "../../hooks/usePrintStyle";
import { useSchedulePersistence } from "../../hooks/useSchedulePersistence";
import { useUndoRedo } from "../../hooks/useUndoRedo";
import { exportScheduleBackup, importScheduleFromFile } from "../../services/scheduleTransfer";

function getSaveIndicator(saveStatus, lastSaved) {
  if (saveStatus === "saving") return "💾 جارٍ الحفظ...";
  if (saveStatus === "error") return "❌ خطأ في الحفظ";
  if (saveStatus === "loaded") return "✅ تم تحميل البيانات";
  return `✅ محفوظ ${lastSaved.toLocaleTimeString()}`;
}

function getSaveColor(saveStatus) {
  if (saveStatus === "saving") return "#f39c12";
  if (saveStatus === "error") return "#e74c3c";
  return "#27ae60";
}

export function usePlannerState() {
  const [days, setDays, undoRedo] = useUndoRedo(
    normalizeDaysCategories(createInitialDays(getCurrentWeekNumber())),
    30,
  );
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [tab, setTab] = useState("editor");
  const [printZoom, setPrintZoom] = useState(100);
  const [showGistSettings, setShowGistSettings] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekNumber());
  const [darkMode, setDarkMode] = useLocalStorageState(DARK_MODE_KEY, false);
  const [weeklyGoals, setWeeklyGoals] = useLocalStorageState(WEEKLY_GOALS_KEY, {});
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState(DEFAULT_GOAL_TARGET);
  const nextTaskIdRef = useRef(getNextTaskIdSeed(days));
  const { undo, redo, replace, canUndo, canRedo } = undoRedo;

  useEffect(() => {
    nextTaskIdRef.current = Math.max(nextTaskIdRef.current, getNextTaskIdSeed(days));
  }, [days]);

  const createTaskId = useCallback(() => {
    nextTaskIdRef.current += 1;
    return nextTaskIdRef.current;
  }, []);

  const restoreSchedule = useCallback(
    (persistedState) => {
      if (persistedState.days) {
        replace(normalizeDaysCategories(persistedState.days));
      }
      if (persistedState.colors) {
        setColors(normalizeColors(persistedState.colors));
      }
    },
    [replace],
  );

  const { lastSaved, saveStatus } = useSchedulePersistence({
    storageKey: LS_KEY,
    days,
    colors,
    onRestore: restoreSchedule,
  });

  usePrintStyle(colors, days);
  useKeyboardShortcuts({ undo, redo, lastSaved });

  const {
    syncStatus,
    lastSyncTime,
    syncError,
    pullFromGist,
    pushToGist,
    createNewGist,
    hasCredentials,
  } = useGistSync(days, colors, (mergedData) => {
    if (!mergedData) return;
    restoreSchedule(mergedData);
  });

  useEffect(() => {
    const weekDates = getWeekDates(selectedWeek);
    setDays((currentDays) =>
      currentDays.map((day, index) => ({
        ...day,
        التاريخ: weekDates[index] || "",
      })),
    );
  }, [selectedWeek, setDays]);

  const goalHours = useMemo(() => calcGoalHours(days), [days]);
  const currentWeekGoals = useMemo(
    () => buildCurrentWeekGoals(weeklyGoals, selectedWeek),
    [selectedWeek, weeklyGoals],
  );
  const goalsSummary = useMemo(
    () => calculateGoalsSummary(goalHours, currentWeekGoals, days),
    [currentWeekGoals, days, goalHours],
  );
  const weekDates = useMemo(() => getWeekDates(selectedWeek), [selectedWeek]);

  const updateDay = useCallback(
    (dayId, patch) => {
      setDays((currentDays) =>
        currentDays.map((day) => (day.id === dayId ? { ...day, ...patch } : day)),
      );
    },
    [setDays],
  );

  const copyDay = useCallback(
    (dayId) => {
      setDays((currentDays) =>
        currentDays.map((day) =>
          day.id === dayId
            ? { ...day, tasks: cloneTasksWithNewIds(day.tasks, createTaskId) }
            : day,
        ),
      );
    },
    [createTaskId, setDays],
  );

  const addGoal = useCallback(() => {
    if (!newGoalName.trim()) return;

    setWeeklyGoals((currentGoals) => ({
      ...currentGoals,
      [selectedWeek]: {
        ...(currentGoals[selectedWeek] || {}),
        [newGoalName]: { target: newGoalTarget, type: "custom" },
      },
    }));

    setNewGoalName("");
    setNewGoalTarget(DEFAULT_GOAL_TARGET);
  }, [newGoalName, newGoalTarget, selectedWeek, setWeeklyGoals]);

  const updateGoalTarget = useCallback(
    (goalName, target) => {
      setWeeklyGoals((currentGoals) => ({
        ...currentGoals,
        [selectedWeek]: {
          ...(currentGoals[selectedWeek] || {}),
          [goalName]: {
            ...((currentGoals[selectedWeek] || {})[goalName] || { type: "predefined" }),
            target,
          },
        },
      }));
    },
    [selectedWeek, setWeeklyGoals],
  );

  const deleteGoal = useCallback(
    (goalName) => {
      setWeeklyGoals((currentGoals) => {
        const nextWeekGoals = { ...(currentGoals[selectedWeek] || {}) };
        delete nextWeekGoals[goalName];

        return {
          ...currentGoals,
          [selectedWeek]: nextWeekGoals,
        };
      });
    },
    [selectedWeek, setWeeklyGoals],
  );

  const changeColor = useCallback((section, field, value) => {
    setColors((currentColors) => ({
      ...currentColors,
      [section]: {
        ...currentColors[section],
        [field]: value,
      },
    }));
  }, []);

  const exportSchedule = useCallback(() => {
    exportScheduleBackup({ days, colors, selectedWeek });
  }, [colors, days, selectedWeek]);

  const importSchedule = useCallback(
    async (file) => {
      const imported = await importScheduleFromFile(file);
      replace(normalizeDaysCategories(imported.days));

      if (imported.colors) {
        setColors(normalizeColors(imported.colors));
      }

      if (imported.selectedWeek) {
        setSelectedWeek(imported.selectedWeek);
      }
    },
    [replace],
  );

  const resetPlanner = useCallback(() => {
    const confirmed = window.confirm("هل تريد إعادة ضبط الجدول والألوان لهذا الأسبوع إلى الحالة الافتراضية؟");
    if (!confirmed) return;

    replace(normalizeDaysCategories(createInitialDays(selectedWeek)));
    setColors(DEFAULT_COLORS);
    setTab("editor");
    setPrintZoom(100);
  }, [replace, selectedWeek]);

  const incrementWeek = useCallback(() => setSelectedWeek((value) => Math.min(52, value + 1)), []);
  const decrementWeek = useCallback(() => setSelectedWeek((value) => Math.max(1, value - 1)), []);
  const zoomIn = useCallback(() => setPrintZoom((value) => Math.min(150, value + 10)), []);
  const zoomOut = useCallback(() => setPrintZoom((value) => Math.max(50, value - 10)), []);

  return {
    days,
    colors,
    tab,
    printZoom,
    darkMode,
    selectedWeek,
    showGistSettings,
    currentWeekGoals,
    goalHours,
    goalsSummary,
    newGoalName,
    newGoalTarget,
    saveIndicator: getSaveIndicator(saveStatus, lastSaved),
    saveColor: getSaveColor(saveStatus),
    weekRangeLabel: `من ${formatDateDisplay(weekDates[0])} إلى ${formatDateDisplay(weekDates[6])}`,
    undoRedo: {
      undo,
      redo,
      replace,
      canUndo,
      canRedo,
    },
    syncStatus,
    lastSyncTime,
    syncError,
    pullFromGist,
    pushToGist,
    createNewGist,
    hasCredentials,
    setTab,
    setDarkMode,
    setSelectedWeek,
    setShowGistSettings,
    setNewGoalName,
    setNewGoalTarget,
    updateDay,
    copyDay,
    createTaskId,
    addGoal,
    updateGoalTarget,
    deleteGoal,
    changeColor,
    exportSchedule,
    importSchedule,
    resetPlanner,
    incrementWeek,
    decrementWeek,
    zoomIn,
    zoomOut,
  };
}
