import { getMonthKey, getWeekNumberFromDate, getWeekKey } from "./week";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function sortByTitle(items) {
  return [...items].sort((left, right) => (left.title || "").localeCompare(right.title || ""));
}

export function createGoalId(prefix = "goal") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeMonthlyGoalEntry(goalId, goalValue) {
  const value = asObject(goalValue);

  if (value.id || value.title) {
    return {
      id: value.id || goalId,
      title: value.title || goalId,
      status: value.status || "active",
      createdAt: value.createdAt || "",
    };
  }

  return {
    id: goalId,
    title: goalId,
    status: "active",
    createdAt: "",
  };
}

function normalizeWeeklyGoalEntry(goalId, goalValue) {
  const value = asObject(goalValue);

  if (value.id || value.title || value.monthlyGoalId) {
    return {
      id: value.id || goalId,
      title: value.title || goalId,
      monthlyGoalId: value.monthlyGoalId || "",
      status: value.status || "active",
      createdAt: value.createdAt || "",
    };
  }

  return {
    id: goalId,
    title: goalId,
    monthlyGoalId: "",
    status: "active",
    createdAt: "",
  };
}

export function normalizeMonthlyGoalsStore(monthlyGoals = {}) {
  return Object.entries(asObject(monthlyGoals)).reduce((result, [monthKey, goals]) => {
    result[monthKey] = Object.entries(asObject(goals)).reduce((goalMap, [goalId, goalValue]) => {
      const normalized = normalizeMonthlyGoalEntry(goalId, goalValue);
      goalMap[normalized.id] = normalized;
      return goalMap;
    }, {});
    return result;
  }, {});
}

export function normalizeWeeklyGoalsStore(weeklyGoals = {}) {
  return Object.entries(asObject(weeklyGoals)).reduce((result, [weekKey, goals]) => {
    result[weekKey] = Object.entries(asObject(goals)).reduce((goalMap, [goalId, goalValue]) => {
      const normalized = normalizeWeeklyGoalEntry(goalId, goalValue);
      goalMap[normalized.id] = normalized;
      return goalMap;
    }, {});
    return result;
  }, {});
}

export function getMonthGoalsForMonth(monthlyGoals, monthKey) {
  return sortByTitle(Object.values(asObject(monthlyGoals[monthKey])));
}

export function getWeekGoalsForWeek(weeklyGoals, weekKey) {
  return sortByTitle(Object.values(asObject(weeklyGoals[weekKey])));
}

export function getWeeklyGoalsByMonthlyGoalId(weeklyGoalsStore) {
  return Object.values(asObject(weeklyGoalsStore)).reduce((result, weekGoals) => {
    Object.values(asObject(weekGoals)).forEach((goal) => {
      if (!goal.monthlyGoalId) return;
      if (!result[goal.monthlyGoalId]) {
        result[goal.monthlyGoalId] = [];
      }
      result[goal.monthlyGoalId].push(goal);
    });
    return result;
  }, {});
}

export function getTaskGoalOptions({ monthGoals, weekGoals, weeklyGoalsStore }) {
  const weeklyChildrenByMonthGoal = getWeeklyGoalsByMonthlyGoalId(weeklyGoalsStore);

  return {
    weeklyGoals: weekGoals,
    monthlyGoals: monthGoals.filter((goal) => !(weeklyChildrenByMonthGoal[goal.id] || []).length),
  };
}

function createProgressRecord(goal) {
  return {
    goalId: goal.id,
    title: goal.title,
    totalTasks: 0,
    doneTasks: 0,
    linkedTaskIds: [],
  };
}

function finalizeProgress(progressMap) {
  return Object.fromEntries(
    Object.entries(progressMap).map(([goalId, record]) => [
      goalId,
      {
        ...record,
        completionRate: record.totalTasks > 0 ? Math.round((record.doneTasks / record.totalTasks) * 100) : 0,
      },
    ]),
  );
}

export function calculateWeeklyGoalProgress(days, weekGoals) {
  const progress = Object.fromEntries(weekGoals.map((goal) => [goal.id, createProgressRecord(goal)]));

  days.forEach((day) => {
    day.tasks.forEach((task) => {
      if (!task.linkedWeeklyGoalId || !progress[task.linkedWeeklyGoalId]) return;

      progress[task.linkedWeeklyGoalId].totalTasks += 1;
      progress[task.linkedWeeklyGoalId].doneTasks += task.done ? 1 : 0;
      progress[task.linkedWeeklyGoalId].linkedTaskIds.push(task.id);
    });
  });

  return finalizeProgress(progress);
}

export function calculateMonthlyGoalProgress(weekSchedules, monthGoals, weeklyGoalsStore, monthKey) {
  const progress = Object.fromEntries(monthGoals.map((goal) => [goal.id, createProgressRecord(goal)]));
  const weekGoalsByMonthGoal = getWeeklyGoalsByMonthlyGoalId(weeklyGoalsStore);
  const childGoalLookup = Object.entries(weekGoalsByMonthGoal).reduce((result, [monthlyGoalId, goals]) => {
    goals.forEach((goal) => {
      result[goal.id] = monthlyGoalId;
    });
    return result;
  }, {});

  Object.values(asObject(weekSchedules)).forEach((days) => {
    (Array.isArray(days) ? days : []).forEach((day) => {
      if (getMonthKey(day.التاريخ) !== monthKey) return;

      day.tasks.forEach((task) => {
        const directMonthlyGoalId = task.linkedMonthlyGoalId;
        const parentMonthlyGoalId = childGoalLookup[task.linkedWeeklyGoalId];
        const targetMonthlyGoalId = directMonthlyGoalId || parentMonthlyGoalId;

        if (!targetMonthlyGoalId || !progress[targetMonthlyGoalId]) return;

        progress[targetMonthlyGoalId].totalTasks += 1;
        progress[targetMonthlyGoalId].doneTasks += task.done ? 1 : 0;
        progress[targetMonthlyGoalId].linkedTaskIds.push(task.id);
      });
    });
  });

  return finalizeProgress(progress);
}

export function calculateMonthSummary(monthProgress) {
  const values = Object.values(monthProgress);
  const totalGoals = values.length;
  const completedGoals = values.filter((goal) => goal.totalTasks > 0 && goal.doneTasks === goal.totalTasks).length;
  const totalTasks = values.reduce((sum, goal) => sum + goal.totalTasks, 0);
  const doneTasks = values.reduce((sum, goal) => sum + goal.doneTasks, 0);

  return {
    totalGoals,
    completedGoals,
    totalTasks,
    doneTasks,
    completionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
  };
}

export function clearGoalLinksFromDays(days, removedGoalIds = [], type = "weekly") {
  const removedSet = new Set(removedGoalIds);
  if (!removedSet.size) return days;

  return days.map((day) => ({
    ...day,
    tasks: day.tasks.map((task) => {
      if (type === "weekly" && removedSet.has(task.linkedWeeklyGoalId)) {
        return {
          ...task,
          linkedWeeklyGoalId: "",
          linkedGoalType: "",
          linkedGoalId: task.linkedMonthlyGoalId || "",
        };
      }

      if (type === "monthly" && removedSet.has(task.linkedMonthlyGoalId)) {
        return {
          ...task,
          linkedMonthlyGoalId: "",
          linkedGoalType: task.linkedWeeklyGoalId ? "weekly" : "",
          linkedGoalId: task.linkedWeeklyGoalId || "",
        };
      }

      return task;
    }),
  }));
}

export function clearGoalLinksFromSchedules(weekSchedules, removedGoalIds = [], type = "weekly") {
  return Object.fromEntries(
    Object.entries(asObject(weekSchedules)).map(([weekKey, days]) => [
      weekKey,
      clearGoalLinksFromDays(Array.isArray(days) ? days : [], removedGoalIds, type),
    ]),
  );
}

export function extractReferencedGoalIds(days = []) {
  const monthlyGoalIds = new Set();
  const weeklyGoalIds = new Set();

  (Array.isArray(days) ? days : []).forEach((day) => {
    (day.tasks || []).forEach((task) => {
      if (task.linkedMonthlyGoalId) {
        monthlyGoalIds.add(task.linkedMonthlyGoalId);
      }
      if (task.linkedWeeklyGoalId) {
        weeklyGoalIds.add(task.linkedWeeklyGoalId);
      }
    });
  });

  return { monthlyGoalIds: Array.from(monthlyGoalIds), weeklyGoalIds: Array.from(weeklyGoalIds) };
}

export function findMissingGoals(monthlyGoalIds = [], weeklyGoalIds = [], monthlyGoalsStore = {}, weeklyGoalsStore = {}) {
  const missingMonthlyGoals = monthlyGoalIds.filter((goalId) => {
    // Check if this goal ID exists in any month bucket
    return !Object.values(asObject(monthlyGoalsStore)).some((monthGoals) => asObject(monthGoals)[goalId]);
  });

  const missingWeeklyGoals = weeklyGoalIds.filter((goalId) => {
    // Check if this goal ID exists in any week bucket
    return !Object.values(asObject(weeklyGoalsStore)).some((weekGoals) => asObject(weekGoals)[goalId]);
  });

  return { missingMonthlyGoals, missingWeeklyGoals };
}

export function createMissingGoalsForImportedData(
  days = [],
  monthlyGoalsStore = {},
  weeklyGoalsStore = {},
  currentYear,
) {
  // Map goal IDs to their week/month assignments
  const goalToWeeksMonths = {
    monthly: {}, // goalId -> Set<monthKey>
    weekly: {},  // goalId -> Set<weekKey>
  };

  // Scan through all tasks to determine which week/month each goal should be in
  (Array.isArray(days) ? days : []).forEach((day) => {
    (day.tasks || []).forEach((task) => {
      if (task.linkedMonthlyGoalId || task.linkedWeeklyGoalId) {
        const monthKey = getMonthKey(day.التاريخ);
        const weekNumber = getWeekNumberFromDate(day.التاريخ, currentYear);
        const weekKey = getWeekKey(weekNumber, currentYear);

        if (task.linkedMonthlyGoalId) {
          if (!goalToWeeksMonths.monthly[task.linkedMonthlyGoalId]) {
            goalToWeeksMonths.monthly[task.linkedMonthlyGoalId] = new Set();
          }
          goalToWeeksMonths.monthly[task.linkedMonthlyGoalId].add(monthKey);
        }
        if (task.linkedWeeklyGoalId) {
          if (!goalToWeeksMonths.weekly[task.linkedWeeklyGoalId]) {
            goalToWeeksMonths.weekly[task.linkedWeeklyGoalId] = new Set();
          }
          goalToWeeksMonths.weekly[task.linkedWeeklyGoalId].add(weekKey);
        }
      }
    });
  });

  let updatedMonthlyStore = monthlyGoalsStore;
  let updatedWeeklyStore = weeklyGoalsStore;
  let hasChanges = false;

  // Create missing monthly goals in their appropriate buckets
  Object.entries(goalToWeeksMonths.monthly).forEach(([goalId, monthKeySet]) => {
    const goalExists = Object.values(asObject(monthlyGoalsStore)).some(
      (monthGoals) => asObject(monthGoals)[goalId],
    );

    if (!goalExists) {
      hasChanges = true;
      if (updatedMonthlyStore === monthlyGoalsStore) {
        updatedMonthlyStore = { ...monthlyGoalsStore };
      }
      
      monthKeySet.forEach((monthKey) => {
        // Ensure the month bucket is copied before modification
        if (!updatedMonthlyStore[monthKey]) {
          updatedMonthlyStore[monthKey] = {};
        } else if (updatedMonthlyStore[monthKey] === monthlyGoalsStore[monthKey]) {
          updatedMonthlyStore[monthKey] = { ...updatedMonthlyStore[monthKey] };
        }
        
        updatedMonthlyStore[monthKey][goalId] = {
          id: goalId,
          title: `Goal: ${goalId}`,
          status: "active",
          createdAt: new Date().toISOString(),
        };
      });
    }
  });

  // Create missing weekly goals in their appropriate buckets
  Object.entries(goalToWeeksMonths.weekly).forEach(([goalId, weekKeySet]) => {
    const goalExists = Object.values(asObject(weeklyGoalsStore)).some(
      (weekGoals) => asObject(weekGoals)[goalId],
    );

    if (!goalExists) {
      hasChanges = true;
      if (updatedWeeklyStore === weeklyGoalsStore) {
        updatedWeeklyStore = { ...weeklyGoalsStore };
      }
      
      weekKeySet.forEach((weekKey) => {
        // Ensure the week bucket is copied before modification
        if (!updatedWeeklyStore[weekKey]) {
          updatedWeeklyStore[weekKey] = {};
        } else if (updatedWeeklyStore[weekKey] === weeklyGoalsStore[weekKey]) {
          updatedWeeklyStore[weekKey] = { ...updatedWeeklyStore[weekKey] };
        }
        
        updatedWeeklyStore[weekKey][goalId] = {
          id: goalId,
          title: `Goal: ${goalId}`,
          monthlyGoalId: "",
          status: "active",
          createdAt: new Date().toISOString(),
        };
      });
    }
  });

  return {
    monthlyGoalsStore: updatedMonthlyStore,
    weeklyGoalsStore: updatedWeeklyStore,
    hasChanges,
  };
}
