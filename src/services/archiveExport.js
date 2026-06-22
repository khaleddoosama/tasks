import { CATEGORY_META } from "../domain/schedule/constants";

// ---- Day metrics label maps ----

const ENERGY_LABELS = {
  "1": "منخفضة جدا 😴",
  "2": "منخفضة 😐",
  "3": "متوسطة 😊",
  "4": "عالية 😄",
  "5": "عالية جدا 🔥",
};

const RATING_LABELS = {
  "1": "سيء جدا 😞",
  "2": "سيء 😕",
  "3": "جيد 😐",
  "4": "جيد جدا 😊",
  "5": "ممتاز 🌟",
};

// ---- Goal lookup helpers ----

function buildWeeklyGoalTitleMap(weeklyGoalsStore = {}) {
  const map = {};
  Object.values(weeklyGoalsStore).forEach((weekGoals) => {
    Object.values(weekGoals || {}).forEach((goal) => {
      if (goal?.id) map[goal.id] = goal.title || goal.id;
    });
  });
  return map;
}

function buildMonthlyGoalTitleMap(monthlyGoalsStore = {}) {
  const map = {};
  Object.values(monthlyGoalsStore).forEach((monthGoals) => {
    Object.values(monthGoals || {}).forEach((goal) => {
      if (goal?.id) map[goal.id] = goal.title || goal.id;
    });
  });
  return map;
}

// ---- Task resolver ----

function resolveTask(task, weeklyGoalTitleMap, monthlyGoalTitleMap) {
  const catMeta = CATEGORY_META[task.cat];
  const categoryLabel = catMeta ? `${catMeta.icon} ${catMeta.label}` : "بدون تصنيف";

  const weeklyGoalTitle = task.linkedWeeklyGoalId
    ? weeklyGoalTitleMap[task.linkedWeeklyGoalId]
    : null;
  const monthlyGoalTitle = task.linkedMonthlyGoalId
    ? monthlyGoalTitleMap[task.linkedMonthlyGoalId]
    : null;

  const resolved = {
    time: task.time || "",
    task: task.task || "",
    category: categoryLabel,
    status: task.done ? "مكتملة" : "لم تكتمل",
  };

  if (weeklyGoalTitle) resolved.weeklyGoal = weeklyGoalTitle;
  if (monthlyGoalTitle) resolved.monthlyGoal = monthlyGoalTitle;
  if (task.notes) resolved.notes = task.notes;

  return resolved;
}

// ---- Main export function ----

/**
 * Collects all days across all week schedules that fall within [fromDate, toDate],
 * resolves every foreign key (category key → label, goal IDs → titles),
 * and downloads a clean JSON file suitable for archiving or feeding to an AI model.
 */
export function exportArchiveRange({
  weekSchedules,
  monthlyGoalsStore,
  weeklyGoalsStore,
  fromDate,
  toDate,
}) {
  const weeklyGoalTitleMap = buildWeeklyGoalTitleMap(weeklyGoalsStore);
  const monthlyGoalTitleMap = buildMonthlyGoalTitleMap(monthlyGoalsStore);

  // Flatten all days from every week bucket, filter by date range
  const matchingDays = Object.values(weekSchedules)
    .flat()
    .filter((day) => {
      const date = day?.التاريخ;
      return date && date >= fromDate && date <= toDate && day.enabled !== false;
    })
    .sort((a, b) => a.التاريخ.localeCompare(b.التاريخ));

  const days = matchingDays.map((day) => {
    const energyEntries = Array.isArray(day.energyLog) ? day.energyLog : [];
    const averageEnergyLevel = energyEntries.length > 0
      ? Math.round(energyEntries.reduce((sum, entry) => sum + parseInt(entry.level || 0), 0) / energyEntries.length)
      : null;
    const energyLabel = averageEnergyLevel ? ENERGY_LABELS[String(averageEnergyLevel)] : null;
    const ratingLabel = RATING_LABELS[day.تقييم_اليوم] || null;

    return {
      date: day.التاريخ,
      dayName: day.name || "",
      type: day.type || "",
      ...(day.notes ? { notes: day.notes } : {}),
      ...(energyLabel ? { energyLevel: energyLabel } : {}),
      ...(energyEntries.length > 0 ? { energyLog: energyEntries } : {}),
      ...(ratingLabel ? { dayRating: ratingLabel } : {}),
      ...(day.عدد_ساعات_النوم ? { sleepHours: day.عدد_ساعات_النوم } : {}),
      ...(day.عدد_ساعات_الهاتف ? { phoneHours: day.عدد_ساعات_الهاتف } : {}),
      tasks: (day.tasks || []).map((task) =>
        resolveTask(task, weeklyGoalTitleMap, monthlyGoalTitleMap),
      ),
    };
  });

  const payload = {
    exportedAt: new Date().toISOString().slice(0, 10),
    dateRange: { from: fromDate, to: toDate },
    totalDays: days.length,
    totalTasks: days.reduce((sum, d) => sum + d.tasks.length, 0),
    days,
  };

  if (days.length === 0) {
    return { totalDays: 0, totalTasks: 0 };
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `archive-${fromDate}--${toDate}.json`;
  anchor.click();

  URL.revokeObjectURL(url);

  return { totalDays: payload.totalDays, totalTasks: payload.totalTasks };
}
