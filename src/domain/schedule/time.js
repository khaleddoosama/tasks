export function parseTimeToMin(value) {
  if (!value) return null;

  const [hours, minutes] = value.trim().split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

export function calculateDurationMin(timeStr) {
  if (!timeStr || timeStr.includes("—")) return 0;

  const parts = timeStr.split("-").map((part) => part.trim());
  if (parts.length !== 2) return 0;

  let start = parseTimeToMin(parts[0]);
  let end = parseTimeToMin(parts[1]);

  if (start === null || end === null) return 0;
  if (end <= start) end += 24 * 60;

  return end - start;
}

export function calculateDuration(timeStr) {
  if (!timeStr || timeStr.includes("—")) return "—";

  const diffMin = calculateDurationMin(timeStr);
  if (diffMin === 0) return "—";

  const hours = Math.floor(diffMin / 60);
  const minutes = diffMin % 60;

  if (hours === 0) return `${minutes} د`;
  if (minutes === 0) return `${hours} س`;

  return `${hours}${(minutes / 60).toFixed(2).slice(1)} س`;
}

export function detectConflicts(tasks) {
  const ranges = tasks
    .map((task) => {
      if (!task.time || task.time.includes("—")) return null;

      const parts = task.time.split("-").map((part) => part.trim());
      if (parts.length !== 2) return null;

      let start = parseTimeToMin(parts[0]);
      let end = parseTimeToMin(parts[1]);

      if (start === null || end === null) return null;
      if (end <= start) end += 24 * 60;

      return { id: task.id, start, end };
    })
    .filter(Boolean);

  const conflicts = new Set();

  for (let left = 0; left < ranges.length; left += 1) {
    for (let right = left + 1; right < ranges.length; right += 1) {
      if (ranges[left].start < ranges[right].end && ranges[right].start < ranges[left].end) {
        conflicts.add(ranges[left].id);
        conflicts.add(ranges[right].id);
      }
    }
  }

  return conflicts;
}

export function isValidTimeFormat(value) {
  if (!value) return true;

  const trimmed = value.trim();
  if (!trimmed.includes("-")) {
    return /^\d{1,2}:\d{2}$/.test(trimmed);
  }

  const parts = trimmed.split("-").map((part) => part.trim());
  if (parts.length !== 2) return false;

  return parts.every((part) => /^\d{1,2}:\d{2}$/.test(part));
}

export function sortTasksByStartTime(tasks) {
  return [...tasks].sort((left, right) => {
    const getStartTime = (task) => {
      if (!task.time) return 24 * 60;

      const [startTime = ""] = task.time.split("-").map((part) => part.trim());
      return parseTimeToMin(startTime) ?? 24 * 60;
    };

    return getStartTime(left) - getStartTime(right);
  });
}

export function splitTimeRange(timeStr) {
  if (!timeStr) {
    return { start: "", end: "" };
  }

  const [start = "", end = ""] = timeStr.split(" - ");
  return { start, end };
}

export function buildTimeRange(start, end) {
  if (start && end) return `${start} - ${end}`;
  return start || "";
}

/**
 * Find the time a newly added task should start at: the end of the most recent
 * task that has a usable time. Scans from the bottom of the list (where a new
 * row is appended) so contiguous days don't require retyping the start time.
 * Falls back to a task's start when it has no end (single-time marker), and to
 * "" when nothing usable is found.
 * @param {Array} tasks
 * @returns {string} "HH:MM" or ""
 */
export function getNextStartTime(tasks) {
  for (let index = tasks.length - 1; index >= 0; index -= 1) {
    const { start, end } = splitTimeRange(tasks[index].time);
    const candidate = end || start;
    if (candidate && parseTimeToMin(candidate) !== null) return candidate;
  }
  return "";
}
