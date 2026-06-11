import { describe, expect, it } from "vitest";
import {
  buildTimeRange,
  calculateDurationMin,
  detectConflicts,
  getNextStartTime,
  isValidTimeFormat,
  parseTimeToMin,
  sortTasksByStartTime,
  splitTimeRange,
} from "./time";

// ── parseTimeToMin ────────────────────────────────────────────────────────────

describe("parseTimeToMin", () => {
  it("converts HH:MM to minutes", () => {
    expect(parseTimeToMin("09:00")).toBe(540);
    expect(parseTimeToMin("00:00")).toBe(0);
    expect(parseTimeToMin("23:30")).toBe(1410);
    expect(parseTimeToMin("1:05")).toBe(65);
  });

  it("returns null for empty or falsy input", () => {
    expect(parseTimeToMin("")).toBeNull();
    expect(parseTimeToMin(null)).toBeNull();
    expect(parseTimeToMin(undefined)).toBeNull();
  });

  it("returns null for invalid format", () => {
    expect(parseTimeToMin("abc")).toBeNull();
    expect(parseTimeToMin("25:00")).toBe(1500); // out of range but numeric — not validated
  });
});

// ── calculateDurationMin ──────────────────────────────────────────────────────

describe("calculateDurationMin", () => {
  it("calculates normal duration in minutes", () => {
    expect(calculateDurationMin("09:00 - 10:00")).toBe(60);
    expect(calculateDurationMin("08:30 - 09:15")).toBe(45);
    expect(calculateDurationMin("00:00 - 23:00")).toBe(1380);
  });

  it("handles midnight wraparound", () => {
    expect(calculateDurationMin("23:00 - 01:00")).toBe(120);
    expect(calculateDurationMin("22:30 - 00:30")).toBe(120);
  });

  it("returns 0 for invalid or missing input", () => {
    expect(calculateDurationMin("")).toBe(0);
    expect(calculateDurationMin(null)).toBe(0);
    expect(calculateDurationMin("—")).toBe(0);
    expect(calculateDurationMin("09:00")).toBe(0); // single time, no range
    expect(calculateDurationMin("abc - def")).toBe(0);
  });
});

// ── splitTimeRange / buildTimeRange ──────────────────────────────────────────

describe("splitTimeRange", () => {
  it("splits 'HH:MM - HH:MM' into start and end", () => {
    expect(splitTimeRange("09:00 - 10:30")).toEqual({ start: "09:00", end: "10:30" });
  });

  it("returns start only when there is no end", () => {
    expect(splitTimeRange("09:00")).toEqual({ start: "09:00", end: "" });
  });

  it("returns empty strings for falsy input", () => {
    expect(splitTimeRange("")).toEqual({ start: "", end: "" });
    expect(splitTimeRange(null)).toEqual({ start: "", end: "" });
  });
});

describe("buildTimeRange", () => {
  it("joins start and end with ' - '", () => {
    expect(buildTimeRange("09:00", "10:00")).toBe("09:00 - 10:00");
  });

  it("returns just the start when end is empty", () => {
    expect(buildTimeRange("09:00", "")).toBe("09:00");
    expect(buildTimeRange("09:00", null)).toBe("09:00");
  });

  it("returns empty string when both are falsy", () => {
    expect(buildTimeRange("", "")).toBe("");
  });
});

// ── getNextStartTime ──────────────────────────────────────────────────────────

describe("getNextStartTime", () => {
  it("returns the end time of the last task", () => {
    const tasks = [
      { time: "08:00 - 09:00" },
      { time: "09:00 - 10:30" },
    ];
    expect(getNextStartTime(tasks)).toBe("10:30");
  });

  it("falls back to start time when task has no end", () => {
    const tasks = [
      { time: "08:00 - 09:00" },
      { time: "09:30" },
    ];
    expect(getNextStartTime(tasks)).toBe("09:30");
  });

  it("skips tasks with no valid time and finds the previous one", () => {
    const tasks = [
      { time: "08:00 - 09:00" },
      { time: "" },
      { time: null },
    ];
    expect(getNextStartTime(tasks)).toBe("09:00");
  });

  it("returns empty string for empty task list", () => {
    expect(getNextStartTime([])).toBe("");
  });
});

// ── detectConflicts ───────────────────────────────────────────────────────────

describe("detectConflicts", () => {
  it("detects overlapping tasks", () => {
    const tasks = [
      { id: 1, time: "09:00 - 10:00" },
      { id: 2, time: "09:30 - 11:00" },
    ];
    const conflicts = detectConflicts(tasks);
    expect(conflicts.has(1)).toBe(true);
    expect(conflicts.has(2)).toBe(true);
  });

  it("returns empty set for non-overlapping tasks", () => {
    const tasks = [
      { id: 1, time: "08:00 - 09:00" },
      { id: 2, time: "09:00 - 10:00" },
    ];
    expect(detectConflicts(tasks).size).toBe(0);
  });

  it("ignores tasks with no valid time range", () => {
    const tasks = [
      { id: 1, time: "" },
      { id: 2, time: "—" },
      { id: 3, time: "09:00" },
    ];
    expect(detectConflicts(tasks).size).toBe(0);
  });
});

// ── isValidTimeFormat ─────────────────────────────────────────────────────────

describe("isValidTimeFormat", () => {
  it("accepts valid single times", () => {
    expect(isValidTimeFormat("09:00")).toBe(true);
    expect(isValidTimeFormat("9:00")).toBe(true);
  });

  it("accepts valid time ranges", () => {
    expect(isValidTimeFormat("09:00-10:00")).toBe(true);
    expect(isValidTimeFormat("9:00-10:30")).toBe(true);
  });

  it("returns true for empty (time is optional)", () => {
    expect(isValidTimeFormat("")).toBe(true);
    expect(isValidTimeFormat(null)).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidTimeFormat("abc")).toBe(false);
    expect(isValidTimeFormat("09:00-")).toBe(false);
  });
});

// ── sortTasksByStartTime ──────────────────────────────────────────────────────

describe("sortTasksByStartTime", () => {
  it("sorts tasks by start time ascending", () => {
    const tasks = [
      { id: 1, time: "10:00 - 11:00" },
      { id: 2, time: "08:00 - 09:00" },
      { id: 3, time: "09:00 - 10:00" },
    ];
    const sorted = sortTasksByStartTime(tasks);
    expect(sorted.map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it("puts tasks with no time at the end", () => {
    const tasks = [
      { id: 1, time: "" },
      { id: 2, time: "08:00 - 09:00" },
    ];
    const sorted = sortTasksByStartTime(tasks);
    expect(sorted[0].id).toBe(2);
    expect(sorted[1].id).toBe(1);
  });

  it("does not mutate the original array", () => {
    const tasks = [{ id: 1, time: "10:00 - 11:00" }, { id: 2, time: "08:00 - 09:00" }];
    sortTasksByStartTime(tasks);
    expect(tasks[0].id).toBe(1);
  });
});
