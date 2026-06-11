import { describe, expect, it } from "vitest";
import { buildTaskSuggestions } from "./suggestions";

const makeSchedule = (weeks) => weeks;

describe("buildTaskSuggestions", () => {
  it("returns empty list and map for empty schedules", () => {
    expect(buildTaskSuggestions({})).toEqual({ list: [], catByName: {} });
    expect(buildTaskSuggestions(null)).toEqual({ list: [], catByName: {} });
  });

  it("collects a single task name", () => {
    const schedules = makeSchedule({
      "2026-W01": [{ tasks: [{ task: "صلاة الفجر", cat: "worship", done: true }] }],
    });
    const { list, catByName } = buildTaskSuggestions(schedules);
    expect(list).toHaveLength(1);
    expect(list[0].task).toBe("صلاة الفجر");
    expect(list[0].count).toBe(1);
    expect(catByName["صلاة الفجر"]).toBe("worship");
  });

  it("increments count for repeated task names", () => {
    const schedules = makeSchedule({
      "2026-W01": [
        { tasks: [{ task: "صلاة الفجر", cat: "worship", done: true }] },
        { tasks: [{ task: "صلاة الفجر", cat: "worship", done: true }] },
      ],
      "2026-W02": [
        { tasks: [{ task: "صلاة الفجر", cat: "worship", done: false }] },
      ],
    });
    const { list } = buildTaskSuggestions(schedules);
    expect(list[0].task).toBe("صلاة الفجر");
    expect(list[0].count).toBe(3);
  });

  it("sorts by descending count", () => {
    const schedules = makeSchedule({
      "2026-W01": [
        {
          tasks: [
            { task: "مهمة أ", cat: "education", done: true },
            { task: "مهمة ب", cat: "tech_projects", done: true },
            { task: "مهمة ب", cat: "tech_projects", done: true },
          ],
        },
      ],
    });
    const { list } = buildTaskSuggestions(schedules);
    expect(list[0].task).toBe("مهمة ب");
    expect(list[1].task).toBe("مهمة أ");
  });

  it("picks the most frequent category for each task", () => {
    const schedules = makeSchedule({
      "2026-W01": [
        {
          tasks: [
            { task: "قراءة", cat: "education", done: true },
            { task: "قراءة", cat: "education", done: true },
            { task: "قراءة", cat: "personal_projects", done: true },
          ],
        },
      ],
    });
    const { catByName } = buildTaskSuggestions(schedules);
    expect(catByName["قراءة"]).toBe("education");
  });

  it("assigns empty string category when task has no cat", () => {
    const schedules = makeSchedule({
      "2026-W01": [{ tasks: [{ task: "مهمة بدون تصنيف", cat: "", done: false }] }],
    });
    const { catByName } = buildTaskSuggestions(schedules);
    expect(catByName["مهمة بدون تصنيف"]).toBe("");
  });

  it("ignores tasks with empty or whitespace-only names", () => {
    const schedules = makeSchedule({
      "2026-W01": [
        {
          tasks: [
            { task: "", cat: "worship", done: false },
            { task: "   ", cat: "worship", done: false },
            { task: "صلاة", cat: "worship", done: true },
          ],
        },
      ],
    });
    const { list } = buildTaskSuggestions(schedules);
    expect(list).toHaveLength(1);
    expect(list[0].task).toBe("صلاة");
  });

  it("handles days with null/undefined tasks gracefully", () => {
    const schedules = makeSchedule({
      "2026-W01": [{ tasks: null }, null, { tasks: [{ task: "مهمة", cat: "education", done: true }] }],
    });
    expect(() => buildTaskSuggestions(schedules)).not.toThrow();
    expect(buildTaskSuggestions(schedules).list).toHaveLength(1);
  });
});
