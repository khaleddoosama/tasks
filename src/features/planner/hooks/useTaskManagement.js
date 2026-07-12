import { useCallback } from "react";
import { cloneTasksForNewWeek } from "../../../domain/schedule/ids.js";

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
   * Clears day-specific data: sleep hours, phone hours, day rating
   * Resets all task done status to false
   */
  const copyPreviousWeek = useCallback(() => {
    if (selectedWeek === 1) return;

    const prevWeekKey = getWeekKey(selectedWeek - 1, currentYear);
    const prevWeekData = weekSchedulesRef.current[prevWeekKey];

    if (!prevWeekData) return;

    const nextWeekDates = getWeekDates(selectedWeek, currentYear);
    const clonedDays = prevWeekData.map((day) => {
      const dayIndex = day.id - 1;
      const correctDate = nextWeekDates[dayIndex] || "";
      return {
        id: day.id,
        name: day.name,
        type: day.type,
        notes: day.notes,
        التاريخ: correctDate,
        تقييم_اليوم: "",
        عدد_ساعات_النوم: "",
        عدد_ساعات_الهاتف: "",
        enabled: day.enabled,
        tasks: cloneTasksForNewWeek(day.tasks, createTaskId),
      };
    });

    replace(clonedDays);
  }, [
    selectedWeek,
    currentYear,
    weekSchedulesRef,
    replace,
    createTaskId,
    cloneTasksForNewWeek,
    getWeekDates,
    getWeekKey,
  ]);

  /**
   * Carry an unfinished task to the next enabled day ("رحّل لبكرة").
   * The task moves (not copies): removed from its day, appended to the next
   * enabled day with done reset and carryCount incremented. From the last
   * enabled day of the week it moves into the first day of the next week.
   */
  const carryTaskToNextDay = useCallback(
    (dayId, taskId) => {
      const sourceDay = days.find((day) => day.id === dayId);
      const task = sourceDay?.tasks.find((t) => t.id === taskId);
      if (!task) return;

      const carriedTask = {
        ...task,
        done: false,
        carryCount: (Number(task.carryCount) || 0) + 1,
      };

      const targetDay = days.find((day) => day.id > dayId && day.enabled);

      if (targetDay) {
        setDays((currentDays) =>
          currentDays.map((day) => {
            if (day.id === dayId) {
              return { ...day, tasks: day.tasks.filter((t) => t.id !== taskId) };
            }
            if (day.id === targetDay.id) {
              return { ...day, tasks: [...day.tasks, carriedTask] };
            }
            return day;
          }),
        );
        return;
      }

      // Last enabled day of the week → move into the first day of next week.
      if (selectedWeek >= 52) return;
      const nextWeekKey = getWeekKey(selectedWeek + 1, currentYear);
      const nextWeekDays =
        weekSchedulesRef.current[nextWeekKey] ||
        normalizeDaysCategories(createInitialDays(selectedWeek + 1));
      const nextWeekTask = {
        ...carriedTask,
        id: createTaskId(),
        // Weekly goals are scoped per week — the link would point at a goal
        // that doesn't exist next week. Monthly links stay valid.
        linkedWeeklyGoalId: "",
        ...(carriedTask.linkedGoalType === "weekly"
          ? { linkedGoalType: "", linkedGoalId: "" }
          : {}),
      };
      const patchedNextWeek = nextWeekDays.map((day, index) =>
        index === 0 ? { ...day, tasks: [...day.tasks, nextWeekTask] } : day,
      );

      updateWeekSchedules((currentSchedules) => ({
        ...currentSchedules,
        [nextWeekKey]: patchedNextWeek,
      }));
      setDays((currentDays) =>
        currentDays.map((day) =>
          day.id === dayId ? { ...day, tasks: day.tasks.filter((t) => t.id !== taskId) } : day,
        ),
      );
    },
    [
      days,
      setDays,
      selectedWeek,
      currentYear,
      weekSchedulesRef,
      updateWeekSchedules,
      createTaskId,
      getWeekKey,
      createInitialDays,
      normalizeDaysCategories,
    ],
  );

  return {
    updateDay,
    copyDay,
    copyPreviousWeek,
    carryTaskToNextDay,
  };
}
