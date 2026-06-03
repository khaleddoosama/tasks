import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGistSync } from "../../useGistSync";
import { useTaskManagement } from "./hooks/useTaskManagement";
import { useGoalManagement } from "./hooks/useGoalManagement";
import { usePersistenceAndColorManagement } from "./hooks/usePersistenceAndColorManagement";
import {
  DARK_MODE_KEY,
  DEFAULT_COLORS,
  LS_KEY,
  MONTHLY_GOALS_KEY,
  WEEKLY_GOALS_KEY,
} from "../../domain/schedule/constants";

const GENERAL_NOTES_KEY = "generalNotes";
import { normalizeColors, normalizeDaysCategories } from "../../domain/schedule/categories";
import {
  calculateMonthSummary,
  calculateMonthlyGoalProgress,
  calculateWeeklyGoalProgress,
  clearGoalLinksFromDays,
  clearGoalLinksFromSchedules,
  createGoalId,
  createMissingGoalsForImportedData,
  getMonthGoalsForMonth,
  getTaskGoalOptions,
  getWeekGoalsForWeek,
  getWeeklyGoalsByMonthlyGoalId,
  normalizeMonthlyGoalsStore,
  normalizeWeeklyGoalsStore,
} from "../../domain/schedule/goals";
import { cloneTasksWithNewIds, getNextTaskIdSeed } from "../../domain/schedule/ids";
import { createInitialDays } from "../../domain/schedule/seedData";
import {
  formatDateDisplay,
  formatMonthDisplay,
  getCurrentWeekNumber,
  getCurrentYear,
  getMonthKey,
  getPrimaryWeekDate,
  getWeekDates,
  getWeekKey,
  getWeekNumberFromDate,
} from "../../domain/schedule/week";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useLocalStorageState } from "../../hooks/useLocalStorageState";
import { usePrintStyle } from "../../hooks/usePrintStyle";
import { useSchedulePersistence } from "../../hooks/useSchedulePersistence";
import { useUndoRedo } from "../../hooks/useUndoRedo";
import { exportScheduleBackup, importScheduleFromFile } from "../../services/scheduleTransfer";
import { exportArchiveRange } from "../../services/archiveExport";

function getSaveIndicator(saveStatus, lastSaved) {
  if (saveStatus === "saving") return "💾 جاري الحفظ...";
  if (saveStatus === "error") return "❌ خطأ في الحفظ";
  if (saveStatus === "loaded") return "✅ تم تحميل البيانات";
  return `✅ محفوظ ${lastSaved.toLocaleTimeString()}`;
}

function getSaveColor(saveStatus) {
  if (saveStatus === "saving") return "#f39c12";
  if (saveStatus === "error") return "#e74c3c";
  return "#27ae60";
}

function normalizeWeekSchedules(weekSchedules = {}) {
  return Object.fromEntries(
    Object.entries(weekSchedules).map(([weekKey, days]) => [weekKey, normalizeDaysCategories(days)]),
  );
}

function ensureWeekGoalBucket(goalStore, weekKey) {
  return {
    ...goalStore,
    [weekKey]: {
      ...(goalStore[weekKey] || {}),
    },
  };
}

function ensureMonthGoalBucket(goalStore, monthKey) {
  return {
    ...goalStore,
    [monthKey]: {
      ...(goalStore[monthKey] || {}),
    },
  };
}

function buildProgressItems(goals, progressMap) {
  return goals.map((goal) => ({
    ...goal,
    progress: progressMap[goal.id] || {
      goalId: goal.id,
      title: goal.title,
      totalTasks: 0,
      doneTasks: 0,
      completionRate: 0,
      linkedTaskIds: [],
    },
  }));
}

export function usePlannerState() {
  const currentYear = getCurrentYear();
  const initialWeek = getCurrentWeekNumber();
  const [selectedWeekValue, setSelectedWeekValue] = useState(initialWeek);
  const [days, setDays, undoRedo] = useUndoRedo(
    normalizeDaysCategories(createInitialDays(initialWeek)),
    30,
  );
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [tab, setTab] = useState("editor");
  const [printZoom, setPrintZoom] = useState(100);
  const [showGistSettings, setShowGistSettings] = useState(false);
  const [darkMode, setDarkMode] = useLocalStorageState(DARK_MODE_KEY, false);
  const [monthlyGoalsStore, setMonthlyGoalsStore] = useLocalStorageState(MONTHLY_GOALS_KEY, {});
  const [weeklyGoalsStore, setWeeklyGoalsStore] = useLocalStorageState(WEEKLY_GOALS_KEY, {});
  const [generalNotes, setGeneralNotes] = useLocalStorageState(GENERAL_NOTES_KEY, []);
  const [weekSchedules, setWeekSchedulesState] = useState({});
  const weekSchedulesRef = useRef({});
  const nextTaskIdRef = useRef(getNextTaskIdSeed(days));
  const { undo, redo, replace, canUndo, canRedo } = undoRedo;

  const updateWeekSchedules = useCallback((updater) => {
    setWeekSchedulesState((currentState) => {
      const nextState = typeof updater === "function" ? updater(currentState) : updater;
      weekSchedulesRef.current = nextState;
      return nextState;
    });
  }, []);

  const selectedWeek = selectedWeekValue;
  const weekKey = useMemo(() => getWeekKey(selectedWeek, currentYear), [currentYear, selectedWeek]);
  const weekDates = useMemo(() => getWeekDates(selectedWeek, currentYear), [currentYear, selectedWeek]);
  const monthKey = useMemo(() => getMonthKey(getPrimaryWeekDate(weekDates)), [weekDates]);
  const effectiveWeekSchedules = useMemo(
    () => (weekSchedules[weekKey] === days ? weekSchedules : { ...weekSchedules, [weekKey]: days }),
    [days, weekKey, weekSchedules],
  );
  const persistencePayload = useMemo(
    () => ({
      weekSchedules: effectiveWeekSchedules,
      colors,
    }),
    [colors, effectiveWeekSchedules],
  );
  const gistPayload = useMemo(
    () => ({
      weekSchedules: effectiveWeekSchedules,
      colors,
      selectedWeek,
      monthlyGoals: monthlyGoalsStore,
      weeklyGoals: weeklyGoalsStore,
    }),
    [colors, effectiveWeekSchedules, monthlyGoalsStore, selectedWeek, weeklyGoalsStore],
  );

  useEffect(() => {
    nextTaskIdRef.current = Math.max(nextTaskIdRef.current, getNextTaskIdSeed(days));
  }, [days]);

  const createTaskId = useCallback(() => {
    nextTaskIdRef.current += 1;
    return nextTaskIdRef.current;
  }, []);

  const applyPlannerData = useCallback(
    (data, fallbackWeek = selectedWeek) => {
      const nextSelectedWeek =
        Number.isFinite(data?.selectedWeek) && data.selectedWeek >= 1 && data.selectedWeek <= 52
          ? data.selectedWeek
          : fallbackWeek;

      let restoredWeekSchedules = {};
      if (data?.weekSchedules) {
        restoredWeekSchedules = normalizeWeekSchedules(data.weekSchedules);
      } else if (data?.days) {
        const restoredWeekKey = getWeekKey(nextSelectedWeek, currentYear);
        restoredWeekSchedules = {
          [restoredWeekKey]: normalizeDaysCategories(data.days),
        };
      }

      if (Object.keys(restoredWeekSchedules).length > 0) {
        const nextWeekKey = getWeekKey(nextSelectedWeek, currentYear);
        const nextDays =
          restoredWeekSchedules[nextWeekKey] || normalizeDaysCategories(createInitialDays(nextSelectedWeek));

        updateWeekSchedules(restoredWeekSchedules);
        setSelectedWeekValue(nextSelectedWeek);
        replace(nextDays);
      }

      if (data?.colors) {
        setColors(normalizeColors(data.colors));
      }

      if (data?.monthlyGoals) {
        setMonthlyGoalsStore(data.monthlyGoals);
      }

      if (data?.weeklyGoals) {
        setWeeklyGoalsStore(data.weeklyGoals);
      }
    },
    [
      currentYear,
      replace,
      selectedWeek,
      setMonthlyGoalsStore,
      setWeeklyGoalsStore,
      updateWeekSchedules,
    ],
  );

  const restoreSchedule = useCallback(
    (persistedState) => {
      applyPlannerData(persistedState, selectedWeek);
    },
    [applyPlannerData, selectedWeek],
  );

  const { lastSaved, saveStatus } = useSchedulePersistence({
    storageKey: LS_KEY,
    payload: persistencePayload,
    onRestore: restoreSchedule,
    isRestorable: (parsed) => Boolean(parsed?.weekSchedules || parsed?.days),
  });

  useEffect(() => {
    updateWeekSchedules((currentSchedules) =>
      currentSchedules[weekKey] === days ? currentSchedules : { ...currentSchedules, [weekKey]: days },
    );
  }, [days, updateWeekSchedules, weekKey]);

  const changeSelectedWeek = useCallback(
    (nextWeek) => {
      if (!Number.isFinite(nextWeek) || nextWeek < 1 || nextWeek > 52 || nextWeek === selectedWeek) {
        return;
      }

      updateWeekSchedules((currentSchedules) =>
        currentSchedules[weekKey] === days ? currentSchedules : { ...currentSchedules, [weekKey]: days },
      );

      const nextWeekKey = getWeekKey(nextWeek, currentYear);
      const nextDays =
        weekSchedulesRef.current[nextWeekKey] || normalizeDaysCategories(createInitialDays(nextWeek));

      setSelectedWeekValue(nextWeek);
      replace(normalizeDaysCategories(nextDays));
    },
    [currentYear, days, replace, selectedWeek, updateWeekSchedules, weekKey],
  );

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
  } = useGistSync(gistPayload, (remoteData) => {
    if (!remoteData) return;
    applyPlannerData(remoteData, selectedWeek);
  });

  const normalizedMonthlyGoals = useMemo(
    () => normalizeMonthlyGoalsStore(monthlyGoalsStore),
    [monthlyGoalsStore],
  );
  const normalizedWeeklyGoals = useMemo(
    () => normalizeWeeklyGoalsStore(weeklyGoalsStore),
    [weeklyGoalsStore],
  );

  const currentMonthGoals = useMemo(
    () => getMonthGoalsForMonth(normalizedMonthlyGoals, monthKey),
    [monthKey, normalizedMonthlyGoals],
  );
  const currentWeekGoals = useMemo(
    () => getWeekGoalsForWeek(normalizedWeeklyGoals, weekKey),
    [normalizedWeeklyGoals, weekKey],
  );

  const taskGoalOptions = useMemo(
    () =>
      getTaskGoalOptions({
        monthGoals: currentMonthGoals,
        weekGoals: currentWeekGoals,
      }),
    [currentMonthGoals, currentWeekGoals],
  );

  const weeklyGoalsByMonthly = useMemo(
    () => getWeeklyGoalsByMonthlyGoalId({ [weekKey]: normalizedWeeklyGoals[weekKey] || {} }),
    [normalizedWeeklyGoals, weekKey],
  );

  const enhancedTaskGoalOptions = useMemo(() => ({
    ...taskGoalOptions,
    weeklyGoalsByMonthly,
    allMonthlyGoals: currentMonthGoals,
  }), [taskGoalOptions, weeklyGoalsByMonthly, currentMonthGoals]);

  const weeklyGoalProgress = useMemo(
    () => calculateWeeklyGoalProgress(days, currentWeekGoals),
    [currentWeekGoals, days],
  );
  const monthlyGoalProgress = useMemo(
    () =>
      calculateMonthlyGoalProgress(
        effectiveWeekSchedules,
        currentMonthGoals,
        normalizedWeeklyGoals,
        monthKey,
      ),
    [currentMonthGoals, effectiveWeekSchedules, monthKey, normalizedWeeklyGoals],
  );
  const monthlySummary = useMemo(
    () => calculateMonthSummary(monthlyGoalProgress),
    [monthlyGoalProgress],
  );

  const currentWeekGoalItems = useMemo(
    () => buildProgressItems(currentWeekGoals, weeklyGoalProgress),
    [currentWeekGoals, weeklyGoalProgress],
  );
  const currentMonthGoalItems = useMemo(
    () => buildProgressItems(currentMonthGoals, monthlyGoalProgress),
    [currentMonthGoals, monthlyGoalProgress],
  );

  // Task management: delegated to useTaskManagement hook
  const { updateDay, copyDay, copyPreviousWeek, saveAsTemplate, applyTemplate } = useTaskManagement({
    days,
    setDays,
    weekSchedulesRef,
    nextTaskIdRef,
    updateWeekSchedules,
    setWeeklyGoalsStore,
    selectedWeek,
    currentYear,
    weekKey,
    weeklyGoalsStore,
    createTaskId,
    replace,
    cloneTasksWithNewIds,
    createGoalId,
    getWeekDates,
    getWeekKey,
    createInitialDays,
    normalizeDaysCategories,
  });

  // Goal management: delegated to useGoalManagement hook
  const { addMonthlyGoal, updateMonthlyGoalTitle, deleteMonthlyGoal, addWeeklyGoal, updateWeeklyGoalTitle, deleteWeeklyGoal } = useGoalManagement({
    monthlyGoalsStore,
    setMonthlyGoalsStore,
    weeklyGoalsStore,
    setWeeklyGoalsStore,
    days,
    setDays,
    updateWeekSchedules,
    effectiveWeekSchedules,
    monthKey,
    weekKey,
    createGoalId,
    ensureMonthGoalBucket,
    ensureWeekGoalBucket,
    normalizedWeeklyGoals,
    clearGoalLinksFromDays,
    clearGoalLinksFromSchedules,
  });

  // Persistence and color management: delegated to usePersistenceAndColorManagement hook
  const { changeColor, exportSchedule, exportArchive, importSchedule, getScheduleData, updateScheduleFromJSON } = usePersistenceAndColorManagement({
    days,
    colors,
    effectiveWeekSchedules,
    monthlyGoalsStore,
    weeklyGoalsStore,
    selectedWeek,
    currentYear,
    setColors,
    setMonthlyGoalsStore,
    setWeeklyGoalsStore,
    replace,
    updateWeekSchedules,
    applyPlannerData,
    normalizeDaysCategories,
    normalizeColors,
    createMissingGoalsForImportedData,
    createInitialDays,
    exportScheduleBackup,
    exportArchiveRange,
    importScheduleFromFile,
    weekKey,
  });

  const resetPlanner = useCallback(() => {
    const confirmed = window.confirm("هل تريد إعادة ضبط جدول هذا الأسبوع فقط إلى الحالة الافتراضية؟");
    if (!confirmed) return;

    const nextDays = normalizeDaysCategories(createInitialDays(selectedWeek));
    replace(nextDays);
    updateWeekSchedules((currentSchedules) => ({ ...currentSchedules, [weekKey]: nextDays }));
    setTab("editor");
    setPrintZoom(100);
  }, [replace, selectedWeek, updateWeekSchedules, weekKey, normalizeDaysCategories, createInitialDays]);

  const incrementWeek = useCallback(() => changeSelectedWeek(Math.min(52, selectedWeek + 1)), [changeSelectedWeek, selectedWeek]);
  const decrementWeek = useCallback(() => changeSelectedWeek(Math.max(1, selectedWeek - 1)), [changeSelectedWeek, selectedWeek]);
  const zoomIn = useCallback(() => setPrintZoom((value) => Math.min(150, value + 10)), []);
  const zoomOut = useCallback(() => setPrintZoom((value) => Math.max(50, value - 10)), []);

  const addGeneralNote = useCallback(
    (text) => {
      const trimmedText = text.trim();
      if (!trimmedText) return;

      const newNote = {
        id: Date.now(),
        text: trimmedText,
        active: true,
        createdAt: new Date().toISOString(),
      };

      setGeneralNotes((currentNotes) => [newNote, ...currentNotes]);
    },
    [setGeneralNotes],
  );

  const updateGeneralNote = useCallback(
    (noteId, text) => {
      const trimmedText = text.trim();
      setGeneralNotes((currentNotes) =>
        currentNotes.map((note) =>
          note.id === noteId ? { ...note, text: trimmedText } : note,
        ),
      );
    },
    [setGeneralNotes],
  );

  const toggleGeneralNoteActive = useCallback(
    (noteId) => {
      setGeneralNotes((currentNotes) =>
        currentNotes.map((note) =>
          note.id === noteId ? { ...note, active: !note.active } : note,
        ),
      );
    },
    [setGeneralNotes],
  );

  const deleteGeneralNote = useCallback(
    (noteId) => {
      setGeneralNotes((currentNotes) =>
        currentNotes.filter((note) => note.id !== noteId),
      );
    },
    [setGeneralNotes],
  );

  const activeGeneralNotes = useMemo(
    () => generalNotes.filter((note) => note.active),
    [generalNotes],
  );

  return {
    days,
    colors,
    tab,
    printZoom,
    darkMode,
    selectedWeek,
    showGistSettings,
    taskGoalOptions: enhancedTaskGoalOptions,
    currentMonthGoals: currentMonthGoalItems,
    currentWeekGoals: currentWeekGoalItems,
    monthlySummary,
    monthKey,
    monthLabel: formatMonthDisplay(monthKey),
    weekKey,
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
    generalNotes,
    activeGeneralNotes,
    addGeneralNote,
    updateGeneralNote,
    toggleGeneralNoteActive,
    deleteGeneralNote,
    setTab,
    setDarkMode,
    setSelectedWeek: changeSelectedWeek,
    setShowGistSettings,
    updateDay,
    copyDay,
    copyPreviousWeek,
    saveAsTemplate,
    applyTemplate,
    createTaskId,
    addMonthlyGoal,
    updateMonthlyGoalTitle,
    addWeeklyGoal,
    updateWeeklyGoalTitle,
    deleteMonthlyGoal,
    deleteWeeklyGoal,
    changeColor,
    exportSchedule,
    exportArchive,
    importSchedule,
    getScheduleData,
    updateScheduleFromJSON,
    resetPlanner,
    incrementWeek,
    decrementWeek,
    zoomIn,
    zoomOut,
  };
}
