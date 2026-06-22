/**
 * Weekly statistics derived from the data the planner already collects:
 * task completion, time spent per category, and the per-day reflection fields
 * (energy, day rating, sleep hours, phone hours). Pure functions only — the
 * StatsTab component handles all formatting/rendering.
 */

import { CATEGORY_META } from "./constants";
import { calculateDurationMin } from "./time";

/**
 * Best-effort parse of the free-text sleep/phone hour fields into a number of
 * hours. The fields are written inconsistently by the user, e.g.
 *   "5:15 + 1:30= 6:45"  → trusts the total after "=" → 6.75
 *   "7.20 + 1.20"        → sums both as H:MM (dot used like a colon) → 8.67
 *   "9:30" / "2:45"      → 9.5 / 2.75
 *   "6"                  → 6
 * Returns null when nothing parseable is found.
 * @param {string} value
 * @returns {number|null}
 */
export function parseHoursLoose(value) {
  if (!value || typeof value !== "string") return null;

  let text = value.trim();
  if (!text) return null;

  // When the user wrote an explicit "= total", trust that total.
  if (text.includes("=")) {
    text = text.slice(text.lastIndexOf("=") + 1);
  }

  const tokens = text.match(/\d+[:.]\d+|\d+/g);
  if (!tokens) return null;

  let total = 0;
  for (const token of tokens) {
    const hm = token.match(/^(\d+)[:.](\d+)$/);
    total += hm ? Number(hm[1]) + Number(hm[2]) / 60 : Number(token);
  }

  return total > 0 ? total : null;
}

function average(values) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Compute statistics for one week's days array.
 * @param {Array} days - The current week's day objects.
 * @returns {Object} Aggregated stats (see fields below).
 */
export function calculateWeekStats(days = []) {
  const activeDays = days.filter((day) => day && day.enabled !== false);

  let totalTasks = 0;
  let doneTasks = 0;
  let totalMinutes = 0;
  const categoryMinutes = {};
  const categoryCounts = {};

  for (const day of activeDays) {
    for (const task of day.tasks || []) {
      totalTasks += 1;
      if (task.done) doneTasks += 1;

      const minutes = calculateDurationMin(task.time);
      totalMinutes += minutes;

      const key = task.cat || "";
      categoryMinutes[key] = (categoryMinutes[key] || 0) + minutes;
      categoryCounts[key] = (categoryCounts[key] || 0) + 1;
    }
  }

  const categories = Object.keys(categoryMinutes)
    .map((key) => ({
      key,
      label: CATEGORY_META[key]?.label || "بدون تصنيف",
      icon: CATEGORY_META[key]?.icon || "❓",
      minutes: categoryMinutes[key],
      taskCount: categoryCounts[key],
    }))
    .filter((entry) => entry.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  const energyValues = activeDays
    .map((day) => {
      const energyEntries = Array.isArray(day.energyLog) ? day.energyLog : [];
      if (energyEntries.length === 0) return null;
      const avg = energyEntries.reduce((sum, entry) => sum + parseInt(entry.level || 0), 0) / energyEntries.length;
      return Math.round(avg);
    })
    .filter((value) => value !== null && value >= 1 && value <= 5);
  const ratingValues = activeDays
    .map((day) => Number(day.تقييم_اليوم))
    .filter((value) => value >= 1 && value <= 5);
  const sleepValues = activeDays
    .map((day) => parseHoursLoose(day.عدد_ساعات_النوم))
    .filter((value) => value !== null);
  const phoneValues = activeDays
    .map((day) => parseHoursLoose(day.عدد_ساعات_الهاتف))
    .filter((value) => value !== null);

  const perDay = activeDays
    .map((day) => {
      const tasks = day.tasks || [];
      const done = tasks.filter((task) => task.done).length;
      const energyEntries = Array.isArray(day.energyLog) ? day.energyLog : [];
      const energyAvg = energyEntries.length > 0
        ? Math.round(energyEntries.reduce((sum, entry) => sum + parseInt(entry.level || 0), 0) / energyEntries.length)
        : null;
      return {
        id: day.id,
        name: day.name,
        type: day.type,
        total: tasks.length,
        done,
        completionRate: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0,
        energy: energyAvg,
        rating: Number(day.تقييم_اليوم) || null,
        sleep: day.عدد_ساعات_النوم || "",
        phone: day.عدد_ساعات_الهاتف || "",
      };
    })
    .filter((day) => day.total > 0 || day.energy || day.rating || day.sleep || day.phone);

  return {
    totalTasks,
    doneTasks,
    completionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
    totalMinutes,
    categories,
    avgEnergy: average(energyValues),
    avgRating: average(ratingValues),
    avgSleepHours: average(sleepValues),
    avgPhoneHours: average(phoneValues),
    perDay,
  };
}
