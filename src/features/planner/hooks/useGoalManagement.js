import { useCallback } from "react";

/**
 * Hook for managing monthly and weekly goals in the planner
 *
 * Responsibilities:
 * - CRUD operations on monthly goals
 * - CRUD operations on weekly goals (linked to monthly goals)
 * - Cascading deletion (deleting monthly goal deletes child weekly goals)
 * - Clearing goal links from tasks across all weeks
 *
 * @param {Object} params - Hook parameters
 * @param {Object} params.monthlyGoalsStore - All monthly goals keyed by month key
 * @param {Function} params.setMonthlyGoalsStore - setState for monthly goals
 * @param {Object} params.weeklyGoalsStore - All weekly goals keyed by week key
 * @param {Function} params.setWeeklyGoalsStore - setState for weekly goals
 * @param {Array} params.days - Current week's days
 * @param {Function} params.setDays - setState for days
 * @param {Function} params.updateWeekSchedules - setState for all weeks
 * @param {Object} params.effectiveWeekSchedules - All weeks' data with current merged
 * @param {string} params.monthKey - Current month key "YYYY-MM"
 * @param {string} params.weekKey - Current week key "YYYY-WNN"
 * @param {Function} params.createGoalId - Generate unique goal IDs
 * @param {Function} params.ensureMonthGoalBucket - Ensure month bucket exists
 * @param {Function} params.ensureWeekGoalBucket - Ensure week bucket exists
 * @param {Object} params.normalizedWeeklyGoals - Normalized weekly goals (for finding children)
 * @param {Function} params.clearGoalLinksFromDays - Remove goal links from days
 * @param {Function} params.clearGoalLinksFromSchedules - Remove goal links from schedules
 *
 * @returns {Object} Goal management methods
 * @returns {Function} returns.addMonthlyGoal - Create new monthly goal
 * @returns {Function} returns.updateMonthlyGoalTitle - Update monthly goal title
 * @returns {Function} returns.deleteMonthlyGoal - Delete monthly goal and children
 * @returns {Function} returns.addWeeklyGoal - Create new weekly goal
 * @returns {Function} returns.updateWeeklyGoalTitle - Update weekly goal title
 * @returns {Function} returns.deleteWeeklyGoal - Delete weekly goal
 */
export function useGoalManagement({
  // Monthly goal state
  monthlyGoalsStore,
  setMonthlyGoalsStore,

  // Weekly goal state
  weeklyGoalsStore,
  setWeeklyGoalsStore,

  // Day/schedule state
  days,
  setDays,
  updateWeekSchedules,
  effectiveWeekSchedules,

  // Context
  monthKey,
  weekKey,

  // Utilities
  createGoalId,
  ensureMonthGoalBucket,
  ensureWeekGoalBucket,
  normalizedWeeklyGoals,
  clearGoalLinksFromDays,
  clearGoalLinksFromSchedules,
}) {
  /**
   * Create a new monthly goal
   * @param {string} title - Goal title
   */
  const addMonthlyGoal = useCallback(
    (title) => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return;

      const goalId = createGoalId("monthly-goal");
      const createdAt = new Date().toISOString();

      setMonthlyGoalsStore((currentStore) => {
        const nextStore = ensureMonthGoalBucket(currentStore, monthKey);
        nextStore[monthKey][goalId] = {
          id: goalId,
          title: trimmedTitle,
          status: "active",
          createdAt,
        };
        return nextStore;
      });
    },
    [monthKey, setMonthlyGoalsStore, createGoalId, ensureMonthGoalBucket],
  );

  /**
   * Update the title of a monthly goal
   * @param {string} goalId - Goal ID to update
   * @param {string} title - New title
   */
  const updateMonthlyGoalTitle = useCallback(
    (goalId, title) => {
      setMonthlyGoalsStore((currentStore) => {
        const nextStore = ensureMonthGoalBucket(currentStore, monthKey);
        if (!nextStore[monthKey][goalId]) return currentStore;
        nextStore[monthKey][goalId] = {
          ...nextStore[monthKey][goalId],
          title,
        };
        return nextStore;
      });
    },
    [monthKey, setMonthlyGoalsStore, ensureMonthGoalBucket],
  );

  /**
   * Delete a monthly goal and all child weekly goals
   * Cascades deletion to clear all goal links from tasks
   * @param {string} goalId - Monthly goal ID to delete
   */
  const deleteMonthlyGoal = useCallback(
    (goalId) => {
      // Find all child weekly goals
      const childWeeklyGoalIds = Object.values(normalizedWeeklyGoals)
        .flatMap((goals) => Object.values(goals))
        .filter((goal) => goal.monthlyGoalId === goalId)
        .map((goal) => goal.id);

      // Delete from monthly goals store
      setMonthlyGoalsStore((currentStore) => {
        const nextStore = ensureMonthGoalBucket(currentStore, monthKey);
        delete nextStore[monthKey][goalId];
        return nextStore;
      });

      // Delete all child weekly goals from all weeks
      setWeeklyGoalsStore((currentStore) =>
        Object.fromEntries(
          Object.entries(currentStore).map(([storedWeekKey, goals]) => {
            const nextGoals = { ...(goals || {}) };
            childWeeklyGoalIds.forEach((childGoalId) => delete nextGoals[childGoalId]);
            return [storedWeekKey, nextGoals];
          }),
        ),
      );

      // Clear goal links from current week tasks
      setDays((currentDays) =>
        clearGoalLinksFromDays(
          clearGoalLinksFromDays(currentDays, childWeeklyGoalIds, "weekly"),
          [goalId],
          "monthly",
        ),
      );

      // Clear goal links from all weeks
      updateWeekSchedules((currentSchedules) =>
        clearGoalLinksFromSchedules(
          clearGoalLinksFromSchedules(currentSchedules, childWeeklyGoalIds, "weekly"),
          [goalId],
          "monthly",
        ),
      );
    },
    [
      monthKey,
      normalizedWeeklyGoals,
      setMonthlyGoalsStore,
      setWeeklyGoalsStore,
      setDays,
      updateWeekSchedules,
      ensureMonthGoalBucket,
      clearGoalLinksFromDays,
      clearGoalLinksFromSchedules,
    ],
  );

  /**
   * Create a new weekly goal linked to a monthly goal
   * @param {string} monthlyGoalId - Parent monthly goal ID
   * @param {string} title - Goal title
   */
  const addWeeklyGoal = useCallback(
    (monthlyGoalId, title) => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return;

      const goalId = createGoalId("weekly-goal");
      const createdAt = new Date().toISOString();

      setWeeklyGoalsStore((currentStore) => {
        const nextStore = ensureWeekGoalBucket(currentStore, weekKey);
        nextStore[weekKey][goalId] = {
          id: goalId,
          title: trimmedTitle,
          monthlyGoalId,
          status: "active",
          createdAt,
        };
        return nextStore;
      });
    },
    [setWeeklyGoalsStore, weekKey, createGoalId, ensureWeekGoalBucket],
  );

  /**
   * Update the title of a weekly goal
   * @param {string} goalId - Goal ID to update
   * @param {string} title - New title
   */
  const updateWeeklyGoalTitle = useCallback(
    (goalId, title) => {
      setWeeklyGoalsStore((currentStore) => {
        const nextStore = ensureWeekGoalBucket(currentStore, weekKey);
        if (!nextStore[weekKey][goalId]) return currentStore;
        nextStore[weekKey][goalId] = {
          ...nextStore[weekKey][goalId],
          title,
        };
        return nextStore;
      });
    },
    [setWeeklyGoalsStore, weekKey, ensureWeekGoalBucket],
  );

  /**
   * Delete a weekly goal and clear goal links from tasks
   * @param {string} goalId - Weekly goal ID to delete
   */
  const deleteWeeklyGoal = useCallback(
    (goalId) => {
      setWeeklyGoalsStore((currentStore) => {
        const nextStore = ensureWeekGoalBucket(currentStore, weekKey);
        delete nextStore[weekKey][goalId];
        return nextStore;
      });

      setDays((currentDays) => clearGoalLinksFromDays(currentDays, [goalId], "weekly"));
      updateWeekSchedules((currentSchedules) =>
        clearGoalLinksFromSchedules(currentSchedules, [goalId], "weekly"),
      );
    },
    [setWeeklyGoalsStore, weekKey, setDays, updateWeekSchedules, ensureWeekGoalBucket, clearGoalLinksFromDays, clearGoalLinksFromSchedules],
  );

  return {
    addMonthlyGoal,
    updateMonthlyGoalTitle,
    deleteMonthlyGoal,
    addWeeklyGoal,
    updateWeeklyGoalTitle,
    deleteWeeklyGoal,
  };
}
