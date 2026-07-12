import { describe, expect, it } from "vitest";
import { calculateWeekStats, parseHoursLoose } from "./stats";

// ── parseHoursLoose ───────────────────────────────────────────────────────────

describe("parseHoursLoose", () => {
  it("parses whole-number hour strings", () => {
    expect(parseHoursLoose("6")).toBe(6);
    expect(parseHoursLoose("8")).toBe(8);
  });

  it("parses HH:MM format", () => {
    expect(parseHoursLoose("9:30")).toBeCloseTo(9.5);
    expect(parseHoursLoose("2:45")).toBeCloseTo(2.75);
    expect(parseHoursLoose("0:30")).toBeCloseTo(0.5);
  });

  it("parses H.MM format (dot as colon)", () => {
    expect(parseHoursLoose("7.30")).toBeCloseTo(7.5);
  });

  it("trusts the total after '=' sign", () => {
    expect(parseHoursLoose("5:15 + 1:30= 6:45")).toBeCloseTo(6.75);
    expect(parseHoursLoose("2:00 + 1:00= 3:00")).toBeCloseTo(3);
  });

  it("sums multiple time tokens when no '=' present", () => {
    expect(parseHoursLoose("7:30 + 1:30")).toBeCloseTo(9);
    expect(parseHoursLoose("3 + 2")).toBe(5);
  });

  it("returns null for null, undefined, or empty string", () => {
    expect(parseHoursLoose(null)).toBeNull();
    expect(parseHoursLoose(undefined)).toBeNull();
    expect(parseHoursLoose("")).toBeNull();
    expect(parseHoursLoose("   ")).toBeNull();
  });

  it("returns null when no numbers are found", () => {
    expect(parseHoursLoose("ساعات")).toBeNull();
    expect(parseHoursLoose("abc")).toBeNull();
  });
});

// ── calculateWeekStats ────────────────────────────────────────────────────────

const makeDay = (overrides = {}) => ({
  id: 1,
  name: "الأحد",
  type: "أوفيس",
  enabled: true,
  tasks: [],
  مستوى_الطاقة: "",
  تقييم_اليوم: "",
  عدد_ساعات_النوم: "",
  عدد_ساعات_الهاتف: "",
  ...overrides,
});

describe("calculateWeekStats", () => {
  it("returns zeroed stats for an empty days array", () => {
    const stats = calculateWeekStats([]);
    expect(stats.totalTasks).toBe(0);
    expect(stats.doneTasks).toBe(0);
    expect(stats.completionRate).toBe(0);
    expect(stats.totalMinutes).toBe(0);
    expect(stats.categories).toHaveLength(0);
    expect(stats.avgEnergy).toBeNull();
    expect(stats.avgSleepHours).toBeNull();
  });

  it("counts total and done tasks correctly", () => {
    const day = makeDay({
      tasks: [
        { id: 1, task: "مهمة 1", time: "09:00 - 10:00", cat: "education", done: true },
        { id: 2, task: "مهمة 2", time: "10:00 - 11:00", cat: "education", done: false },
        { id: 3, task: "مهمة 3", time: "11:00 - 12:00", cat: "worship", done: true },
      ],
    });
    const stats = calculateWeekStats([day]);
    expect(stats.totalTasks).toBe(3);
    expect(stats.doneTasks).toBe(2);
    expect(stats.completionRate).toBe(67);
  });

  it("sums task durations into totalMinutes", () => {
    const day = makeDay({
      tasks: [
        { id: 1, task: "مهمة", time: "09:00 - 10:00", cat: "education", done: false },
        { id: 2, task: "مهمة", time: "10:00 - 10:30", cat: "worship", done: false },
      ],
    });
    expect(calculateWeekStats([day]).totalMinutes).toBe(90);
  });

  it("groups minutes by category and sorts descending", () => {
    const day = makeDay({
      tasks: [
        { id: 1, time: "09:00 - 11:00", cat: "education", done: false },  // 120 min
        { id: 2, time: "11:00 - 11:30", cat: "worship", done: false },    //  30 min
      ],
    });
    const { categories } = calculateWeekStats([day]);
    expect(categories[0].key).toBe("education");
    expect(categories[0].minutes).toBe(120);
    expect(categories[1].key).toBe("worship");
    expect(categories[1].minutes).toBe(30);
  });

  it("excludes disabled days", () => {
    const active   = makeDay({ tasks: [{ id: 1, time: "09:00 - 10:00", cat: "education", done: true }] });
    const disabled = makeDay({ enabled: false, tasks: [{ id: 2, time: "08:00 - 09:00", cat: "worship", done: true }] });
    const stats = calculateWeekStats([active, disabled]);
    expect(stats.totalTasks).toBe(1);
  });

  it("averages energy and rating from filled days", () => {
    const days = [
      makeDay({ energyLog: [{ time: "10:00", level: "4" }], تقييم_اليوم: "5" }),
      makeDay({ energyLog: [{ time: "10:00", level: "2" }], تقييم_اليوم: "3" }),
    ];
    const stats = calculateWeekStats(days);
    expect(stats.avgEnergy).toBeCloseTo(3);
    expect(stats.avgRating).toBeCloseTo(4);
  });

  it("averages sleep hours using parseHoursLoose", () => {
    const days = [
      makeDay({ عدد_ساعات_النوم: "8" }),
      makeDay({ عدد_ساعات_النوم: "6" }),
    ];
    expect(calculateWeekStats(days).avgSleepHours).toBeCloseTo(7);
  });

  it("includes day in perDay only when it has data", () => {
    const emptyDay  = makeDay({ tasks: [], مستوى_الطاقة: "", تقييم_اليوم: "" });
    const activeDay = makeDay({ tasks: [{ id: 1, time: "", cat: "", done: false }] });
    const stats = calculateWeekStats([emptyDay, activeDay]);
    expect(stats.perDay).toHaveLength(1);
  });

  it("handles tasks with no time (contributes 0 minutes)", () => {
    const day = makeDay({
      tasks: [{ id: 1, task: "مهمة بدون وقت", time: "", cat: "education", done: true }],
    });
    const stats = calculateWeekStats([day]);
    expect(stats.totalTasks).toBe(1);
    expect(stats.doneTasks).toBe(1);
    expect(stats.totalMinutes).toBe(0);
  });
});
