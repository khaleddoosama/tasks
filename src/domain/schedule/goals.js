import { DEFAULT_GOAL_TARGET, GOALS, GOAL_KEYWORDS } from "./constants";
import { calculateDurationMin } from "./time";

export function calcGoalHours(days) {
  const result = {};
  GOALS.forEach((goal) => {
    result[goal] = 0;
  });

  days.forEach((day) => {
    if (!day.enabled) return;

    day.tasks.forEach((task) => {
      const lowerTask = task.task.toLowerCase();

      Object.entries(GOAL_KEYWORDS).forEach(([goal, keywords]) => {
        if (keywords.some((keyword) => lowerTask.includes(keyword.toLowerCase()))) {
          result[goal] = (result[goal] || 0) + calculateDurationMin(task.time);
        }
      });
    });
  });

  GOALS.forEach((goal) => {
    result[goal] = Math.round((result[goal] / 60) * 100) / 100;
  });

  return result;
}

export function buildCurrentWeekGoals(weeklyGoals, selectedWeek) {
  const weekGoals = weeklyGoals[selectedWeek] || {};
  const mergedGoals = { ...weekGoals };

  GOALS.forEach((goal) => {
    if (!mergedGoals[goal]) {
      mergedGoals[goal] = { target: DEFAULT_GOAL_TARGET, type: "predefined" };
    }
  });

  return mergedGoals;
}

export function calculateGoalsSummary(goalHours, currentWeekGoals, days) {
  const trackedHours = Object.values(goalHours).reduce((sum, value) => sum + value, 0);
  const targetHours = Object.values(currentWeekGoals).reduce(
    (sum, goal) => sum + (goal.target || DEFAULT_GOAL_TARGET),
    0,
  );

  return {
    trackedHours,
    targetHours,
    completionRate: targetHours > 0 ? Math.round((trackedHours / targetHours) * 100) : 0,
    activeDays: days.filter((day) => day.enabled).length,
  };
}
