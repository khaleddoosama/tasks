import { useCallback } from "react";
import { getTemplate, saveTemplate } from "../../../services/dayTemplates";

/**
 * Hook for managing task operations within the planner
 *
 * Responsibilities:
 * - CRUD operations on individual days/tasks (updateDay)
 * - Copying tasks between days (copyDay)
 * - Copying entire weeks with goal cloning (copyPreviousWeek)
 * - Saving/loading day templates from localStorage (saveAsTemplate, applyTemplate)
 * - Generating unique task IDs (createTaskId)
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
 * @returns {Function} returns.saveAsTemplate - Save day to localStorage template
 * @returns {Function} returns.applyTemplate - Apply template to a day
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

  /**
   * Save current day as a reusable template in localStorage
   * @param {number} dayId - Day ID to save
   * @param {string} templateName - Template name (user-friendly identifier)
   */
  const saveAsTemplate = useCallback(
    (dayId, templateName) => {
      const day = days.find((d) => d.id === dayId);
      if (!day || !templateName.trim()) return;

      saveTemplate(templateName, {
        name: templateName,
        type: day.type,
        notes: day.notes,
        tasks: day.tasks.map((t) => ({ ...t })),
        مستوى_الطاقة: day.مستوى_الطاقة,
        تقييم_اليوم: day.تقييم_اليوم,
        عدد_ساعات_النوم: day.عدد_ساعات_النوم,
        عدد_ساعات_الهاتف: day.عدد_ساعات_الهاتف,
      });
    },
    [days],
  );

  /**
   * Load a saved template and apply it to a specific day
   * Clones tasks with new IDs, preserves other day properties
   * @param {number} dayId - Day ID to apply template to
   * @param {string} templateName - Template name to load
   */
  const applyTemplate = useCallback(
    (dayId, templateName) => {
      const template = getTemplate(templateName);

      if (!template) return;

      updateDay(dayId, {
        type: template.type,
        notes: template.notes,
        tasks: cloneTasksWithNewIds(template.tasks, createTaskId),
        مستوى_الطاقة: template.مستوى_الطاقة,
        تقييم_اليوم: template.تقييم_اليوم,
        عدد_ساعات_النوم: template.عدد_ساعات_النوم,
        عدد_ساعات_الهاتف: template.عدد_ساعات_الهاتف,
      });
    },
    [updateDay, createTaskId, cloneTasksWithNewIds],
  );

  return {
    updateDay,
    copyDay,
    copyPreviousWeek,
    saveAsTemplate,
    applyTemplate,
  };
}
