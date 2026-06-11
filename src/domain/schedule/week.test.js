import { describe, expect, it } from "vitest";
import {
  formatDateDisplay,
  formatLocalDate,
  formatMonthDisplay,
  getMonthKey,
  getPrimaryWeekDate,
  getWeekDates,
  getWeekKey,
  getWeekNumberFromDate,
  getWeekStartDate,
} from "./week";

const YEAR = 2026;

// ── getWeekKey ────────────────────────────────────────────────────────────────

describe("getWeekKey", () => {
  it("pads single-digit week numbers", () => {
    expect(getWeekKey(1, YEAR)).toBe("2026-W01");
    expect(getWeekKey(9, YEAR)).toBe("2026-W09");
  });

  it("does not pad double-digit week numbers", () => {
    expect(getWeekKey(24, YEAR)).toBe("2026-W24");
    expect(getWeekKey(52, YEAR)).toBe("2026-W52");
  });
});

// ── getMonthKey ───────────────────────────────────────────────────────────────

describe("getMonthKey", () => {
  it("extracts YYYY-MM from an ISO date string", () => {
    expect(getMonthKey("2026-06-11")).toBe("2026-06");
    expect(getMonthKey("2026-01-01")).toBe("2026-01");
  });

  it("returns empty string for falsy input", () => {
    expect(getMonthKey("")).toBe("");
    expect(getMonthKey(null)).toBe("");
    expect(getMonthKey(undefined)).toBe("");
  });
});

// ── formatDateDisplay ─────────────────────────────────────────────────────────

describe("formatDateDisplay", () => {
  it("converts ISO date to DD/M/YYYY Arabic display format", () => {
    expect(formatDateDisplay("2026-06-11")).toBe("11/6/2026");
    expect(formatDateDisplay("2026-01-05")).toBe("05/1/2026");
  });

  it("returns empty string for falsy input", () => {
    expect(formatDateDisplay("")).toBe("");
    expect(formatDateDisplay(null)).toBe("");
  });
});

// ── formatMonthDisplay ────────────────────────────────────────────────────────

describe("formatMonthDisplay", () => {
  it("converts month key to M/YYYY format", () => {
    expect(formatMonthDisplay("2026-06")).toBe("6/2026");
    expect(formatMonthDisplay("2026-01")).toBe("1/2026");
  });

  it("returns empty string for falsy input", () => {
    expect(formatMonthDisplay("")).toBe("");
    expect(formatMonthDisplay(null)).toBe("");
  });
});

// ── formatLocalDate ───────────────────────────────────────────────────────────

describe("formatLocalDate", () => {
  it("formats a Date object to YYYY-MM-DD", () => {
    expect(formatLocalDate(new Date(2026, 5, 11))).toBe("2026-06-11"); // June = month 5
    expect(formatLocalDate(new Date(2026, 0, 1))).toBe("2026-01-01");
  });

  it("round-trips an ISO string unchanged", () => {
    expect(formatLocalDate("2026-06-11")).toBe("2026-06-11");
  });
});

// ── getWeekDates ──────────────────────────────────────────────────────────────

describe("getWeekDates", () => {
  it("returns exactly 7 dates", () => {
    expect(getWeekDates(1, YEAR)).toHaveLength(7);
    expect(getWeekDates(24, YEAR)).toHaveLength(7);
  });

  it("all dates are in YYYY-MM-DD format", () => {
    const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
    getWeekDates(10, YEAR).forEach((date) => {
      expect(date).toMatch(isoPattern);
    });
  });

  it("dates are consecutive", () => {
    const dates = getWeekDates(10, YEAR);
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      expect(curr - prev).toBe(24 * 60 * 60 * 1000); // exactly 1 day apart
    }
  });

  it("week starts on Saturday (day 6)", () => {
    const dates = getWeekDates(1, YEAR);
    const firstDay = new Date(dates[0]).getDay();
    expect(firstDay).toBe(6); // Saturday
  });
});

// ── getWeekStartDate ──────────────────────────────────────────────────────────

describe("getWeekStartDate", () => {
  it("returns the Saturday on or before the given date", () => {
    const sat = getWeekStartDate("2026-06-06"); // Saturday
    expect(new Date(sat).getDay()).toBe(6);

    const sun = getWeekStartDate("2026-06-07"); // Sunday — should go back to Saturday
    expect(formatLocalDate(sun)).toBe(formatLocalDate(sat));
  });
});

// ── getWeekNumberFromDate ─────────────────────────────────────────────────────

describe("getWeekNumberFromDate", () => {
  it("round-trips through getWeekDates", () => {
    for (const week of [1, 10, 24, 52]) {
      const dates = getWeekDates(week, YEAR);
      const recovered = getWeekNumberFromDate(dates[0], YEAR);
      expect(recovered).toBe(week);
    }
  });
});

// ── getPrimaryWeekDate ────────────────────────────────────────────────────────

describe("getPrimaryWeekDate", () => {
  it("returns the second date (index 1) when available", () => {
    const dates = ["2026-06-06", "2026-06-07", "2026-06-08"];
    expect(getPrimaryWeekDate(dates)).toBe("2026-06-07");
  });

  it("falls back to index 0 when only one date exists", () => {
    expect(getPrimaryWeekDate(["2026-06-06"])).toBe("2026-06-06");
  });

  it("returns empty string for empty array", () => {
    expect(getPrimaryWeekDate([])).toBe("");
  });
});
