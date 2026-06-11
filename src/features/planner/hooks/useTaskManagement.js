import { useCallback } from "react";

/**
 * Hook for managing task operations within the planner
 *
 * Responsibilities:
 * - CRUD operations on individual days/tasks (updateDay)
 * - Copying tasks between days (copyDay)
 * - Copying entire weeks with goal cloning (copyPreviousWeek)
 *
 * Day-template save/apply lives in usePlannerState so template writes flow
 * through the synced templates state.
 *
 * @param {Object} params - Hook parameters
 * @param {Array} params.days - Current week's days array
 * @param {Function} params.setDays - setState for days
 * @param {Object} params.weekSchedulesRef - Ref to all weeks' cached data
 * @param {Object} params.nextTaskIdRef - Ref to task ID counter
 * @param {Function} params.updateWeekSchedules - setState for week schedules
 * @param {Function} params.setWeeklyGoalsStore - setState for weekly goals
 * @param {number} params.selectedWeek - Current week number (1-52)
 * @param {number} params.currentYear - Current year
 * @param {string} params.weekKey - Week key "YYYY-WNN"
 * @param {Object} params.weeklyGoalsStore - All weekly goals
 * @param {Function} params.createTaskId - Task ID generator
 * @param {Function} params.replace - Replace days from useUndoRedo
 * @param {Function} params.cloneTasksWithNewIds - Utility to clone tasks with new IDs
 * @param {Function} params.createGoalId - Utility to generate goal IDs
 * @param {Function} params.getWeekDates - Utility to get week dates
 * @param {Function} params.getWeekKey - Utility to generate week key
 * @param {Function} params.createInitialDays - Utility to scaffold default week
 * @param {Function} params.normalizeDaysCategories - Utility to normalize day data
 *
 * @returns {Object} Task management methods
 * @returns {Function} returns.updateDay - Update specific day properties
 * @returns {Function} returns.copyDay - Clone tasks within a day
 * @returns {Function} returns.copyPreviousWeek - Copy entire previous week
 */
export function useTaskManagement({
  // Current state
  days,
  setDays,

  // Refs
  weekSchedulesRef,
  nextTaskIdRef,

  // State setters
  updateWeekSchedules,
  setWeeklyGoalsStore,

  // Context
  selectedWeek,
  currentYear,
  weekKey,
  weeklyGoalsStore,

  // Utilities
  createTaskId,
  replace,
  cloneTasksWithNewIds,
  createGoalId,
  getWeekDates,
  getWeekKey,
  createInitialDays,
  normalizeDaysCategories,
}) {
  /**
   * Update specific day with partial properties
   * @param {number} dayId - Day ID (1-7 for Sat-Fri)
   * @param {Object} patch - Properties to update
   */
  const updateDay = useCallback(
    (dayId, patch) => {
      setDays((currentDays) =>
        currentDays.map((day) => (day.id === dayId ? { ...day, ...patch } : day)),
      );
    },
    [setDays],
  );

  /**
   * Clone all tasks within a single day, generating new task IDs
   * @param {number} dayId - Day ID to copy tasks from
   */
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
    [createTaskId, setDays, cloneTasksWithNewIds],
  );

  /**
   * Copy entire previous week (all 7 days + tasks + weekly goals)
   * Updates dates to current week, generates new task IDs, clones weekly goals
   */
  const copyPreviousWeek = useCallback(() => {
    if (selectedWeek === 1) return;

    const prevWeekKey = getWeekKey(selectedWeek - 1, currentYear);
    const prevWeekData = weekSchedulesRef.current[prevWeekKey];

    if (!prevWeekData) return;

    const nextWeekDates = getWeekDates(selectedWeek, currentYear);
    const clonedDays = prevWeekData.map((day) => ({
      ...day,
      التاريخ: nextWeekDates[day.id - 1],
      tasks: cloneTasksWithNewIds(day.tasks, createTaskId),
    }));

    replace(clonedDays);

    const prevWeekGoals = weeklyGoalsStore[prevWeekKey] || {};
    if (Object.keys(prevWeekGoals).length > 0) {
      const clonedGoals = {};
      Object.entries(prevWeekGoals).forEach(([, goal]) => {
        const newGoalId = createGoalId("weekly-goal");
        clonedGoals[newGoalId] = {
          ...goal,
          id: newGoalId,
          createdAt: new Date().toISOString(),
        };
      });
      setWeeklyGoalsStore((prev) => ({
        ...prev,
        [weekKey]: clonedGoals,
      }));
    }
  }, [
    selectedWeek,
    currentYear,
    weekSchedulesRef,
    weeklyGoalsStore,
    weekKey,
    replace,
    createTaskId,
    setWeeklyGoalsStore,
    cloneTasksWithNewIds,
    createGoalId,
    getWeekDates,
    getWeekKey,
  ]);

  return {
    updateDay,
    copyDay,
    copyPreviousWeek,
  };
}
