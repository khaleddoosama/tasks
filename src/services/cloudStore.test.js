import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./supabaseClient", () => ({
  supabase: { from: vi.fn() },
  supabaseUrl: "https://test-project.supabase.co",
  supabaseAnonKey: "test-anon-key",
}));

import { supabase } from "./supabaseClient";
import {
  clearDayIdCache,
  fetchAllWeeks,
  flushPushKeepalive,
  hasAnyData,
  upsertUserData,
  upsertWeek,
} from "./cloudStore";

// ── Test helpers ────────────────────────────────────────────────────────────

// Builds a chainable, thenable query mock: every method returns the chain,
// awaiting it resolves `result`, and each call is recorded in `calls`.
function chainMock(result, calls = []) {
  const chain = {};
  for (const method of ["upsert", "select", "single", "eq", "not", "delete", "order", "limit", "maybeSingle"]) {
    chain[method] = vi.fn((...args) => {
      calls.push([method, ...args]);
      return chain;
    });
  }
  chain.then = (resolve) => resolve(typeof result === "function" ? result() : result);
  return chain;
}

const sampleDay = {
  id: 1,
  name: "السبت",
  التاريخ: "2026-07-11",
  type: "بيت",
  notes: "ملاحظة",
  enabled: true,
  energyLog: [{ time: "10:00", level: 4 }],
  تقييم_اليوم: "4",
  عدد_ساعات_النوم: "7:30",
  عدد_ساعات_الهاتف: "2",
  tasks: [
    {
      id: 101,
      time: "09:00 - 10:00",
      task: "قراءة",
      cat: "education",
      done: true,
      carryCount: 2,
      notes: "",
      linkedWeeklyGoalId: "wg1",
      linkedMonthlyGoalId: "",
      linkedGoalType: "weekly",
      linkedGoalId: "wg1",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  clearDayIdCache();
});

// ── upsertWeek ──────────────────────────────────────────────────────────────

describe("upsertWeek", () => {
  it("maps Arabic day fields to columns and tasks to snake_case rows", async () => {
    const daysCalls = [];
    const tasksCalls = [];
    supabase.from.mockImplementation((table) =>
      table === "days"
        ? chainMock({ data: { id: 55 }, error: null }, daysCalls)
        : chainMock({ error: null }, tasksCalls),
    );

    const result = await upsertWeek("user-1", "2026-W28", [sampleDay]);
    expect(result.error).toBeNull();

    const dayRow = daysCalls.find(([m]) => m === "upsert")[1];
    expect(dayRow).toMatchObject({
      user_id: "user-1",
      week_key: "2026-W28",
      day_index: 0,
      name: "السبت",
      date: "2026-07-11",
      rating: "4",
      sleep_hours: "7:30",
      phone_hours: "2",
      energy_log: [{ time: "10:00", level: 4 }],
    });

    const taskRows = tasksCalls.find(([m]) => m === "upsert")[1];
    expect(taskRows).toHaveLength(1);
    expect(taskRows[0]).toMatchObject({
      user_id: "user-1",
      day_id: 55,
      app_id: 101,
      task: "قراءة",
      cat: "education",
      done: true,
      carry_count: 2,
      linked_weekly_goal_id: "wg1",
      linked_goal_type: "weekly",
    });

    // Removed-task reconciliation: delete everything except current app_ids
    const notCall = tasksCalls.find(([m]) => m === "not");
    expect(notCall).toEqual(["not", "app_id", "in", "(101)"]);
  });

  it("deletes all of a day's tasks when the app has none", async () => {
    const tasksCalls = [];
    supabase.from.mockImplementation((table) =>
      table === "days"
        ? chainMock({ data: { id: 7 }, error: null })
        : chainMock({ error: null }, tasksCalls),
    );

    await upsertWeek("user-1", "2026-W28", [{ ...sampleDay, tasks: [] }]);

    expect(tasksCalls.some(([m]) => m === "delete")).toBe(true);
    expect(tasksCalls.find(([m]) => m === "eq")).toEqual(["eq", "day_id", 7]);
    expect(tasksCalls.some(([m]) => m === "upsert")).toBe(false);
  });

  it("returns the error and stops when the day upsert fails", async () => {
    const boom = new Error("rls denied");
    supabase.from.mockImplementation((table) =>
      table === "days" ? chainMock({ data: null, error: boom }) : chainMock({ error: null }),
    );

    const result = await upsertWeek("user-1", "2026-W28", [sampleDay]);
    expect(result.error).toBe(boom);
    expect(supabase.from).not.toHaveBeenCalledWith("tasks");
  });

  it("returns the error when the tasks upsert fails", async () => {
    const boom = new Error("bad tasks");
    supabase.from.mockImplementation((table) =>
      table === "days"
        ? chainMock({ data: { id: 1 }, error: null })
        : chainMock({ error: boom }),
    );

    const result = await upsertWeek("user-1", "2026-W28", [sampleDay]);
    expect(result.error).toBe(boom);
  });
});

// ── fetchAllWeeks ───────────────────────────────────────────────────────────

describe("fetchAllWeeks", () => {
  const dayRows = [
    {
      id: 10,
      week_key: "2026-W28",
      day_index: 0,
      name: "السبت",
      date: "2026-07-11",
      type: "بيت",
      notes: "",
      enabled: true,
      energy_log: [],
      rating: "5",
      sleep_hours: "8",
      phone_hours: "1",
    },
  ];
  const taskRows = [
    {
      id: 900,
      day_id: 10,
      app_id: 101,
      task_order: 0,
      time: "09:00 - 10:00",
      task: "قراءة",
      cat: "education",
      done: false,
      carry_count: 3,
      notes: "ملاحظة",
      linked_weekly_goal_id: null,
      linked_monthly_goal_id: "mg1",
      linked_goal_type: "monthly",
      linked_goal_id: "mg1",
    },
  ];

  it("reconstructs the app's weekSchedules shape with Arabic keys", async () => {
    supabase.from.mockImplementation((table) =>
      table === "days"
        ? chainMock({ data: dayRows, error: null })
        : chainMock({ data: taskRows, error: null }),
    );

    const { data, error } = await fetchAllWeeks("user-1");
    expect(error).toBeNull();

    const day = data["2026-W28"][0];
    expect(day).toMatchObject({
      name: "السبت",
      التاريخ: "2026-07-11",
      تقييم_اليوم: "5",
      عدد_ساعات_النوم: "8",
      عدد_ساعات_الهاتف: "1",
    });
    expect(day.tasks[0]).toMatchObject({
      id: 101,
      task: "قراءة",
      carryCount: 3,
      linkedMonthlyGoalId: "mg1",
      linkedGoalType: "monthly",
    });
  });

  it("propagates a days fetch error", async () => {
    const boom = new Error("network");
    supabase.from.mockImplementation(() => chainMock({ data: null, error: boom }));

    const { data, error } = await fetchAllWeeks("user-1");
    expect(data).toBeNull();
    expect(error).toBe(boom);
  });
});

// ── user data + hasAnyData ─────────────────────────────────────────────────

describe("upsertUserData", () => {
  it("maps camelCase payload to snake_case columns", async () => {
    const calls = [];
    supabase.from.mockImplementation(() => chainMock({ error: null }, calls));

    await upsertUserData("user-1", {
      colors: { header: { bg: "#000" } },
      darkMode: true,
      selectedWeek: 28,
      monthlyGoals: { "2026-07": {} },
      weeklyGoals: {},
      templates: {},
      generalNotes: [{ id: 1 }],
    });

    const row = calls.find(([m]) => m === "upsert")[1];
    expect(row).toMatchObject({
      user_id: "user-1",
      dark_mode: true,
      selected_week: 28,
      monthly_goals: { "2026-07": {} },
      general_notes: [{ id: 1 }],
    });
  });
});

describe("hasAnyData", () => {
  it("returns true when a day row exists and false otherwise", async () => {
    supabase.from.mockImplementation(() => chainMock({ data: [{ id: 1 }] }));
    expect(await hasAnyData("user-1")).toBe(true);

    supabase.from.mockImplementation(() => chainMock({ data: [] }));
    expect(await hasAnyData("user-1")).toBe(false);
  });
});

// ── flushPushKeepalive ─────────────────────────────────────────────────────

describe("flushPushKeepalive", () => {
  const weekSchedules = { "2026-W28": [sampleDay] };

  function seedDayIdCache() {
    // fetchAllWeeks fills the cache: (user-1, 2026-W28, 0) → 10
    supabase.from.mockImplementation((table) =>
      table === "days"
        ? chainMock({ data: [{ id: 10, week_key: "2026-W28", day_index: 0, energy_log: [] }], error: null })
        : chainMock({ data: [], error: null }),
    );
    return fetchAllWeeks("user-1");
  }

  beforeEach(() => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true }));
  });

  it("sends keepalive upserts for changed weeks, their tasks, and user_data", async () => {
    await seedDayIdCache();

    flushPushKeepalive({
      userId: "user-1",
      accessToken: "jwt-token",
      weekSchedules,
      changedWeekKeys: ["2026-W28"],
      userData: { colors: null, darkMode: false, monthlyGoals: {}, weeklyGoals: {}, templates: {}, generalNotes: [] },
    });

    const urls = global.fetch.mock.calls.map(([url]) => url);
    expect(urls).toEqual([
      "https://test-project.supabase.co/rest/v1/days?on_conflict=user_id,week_key,day_index",
      "https://test-project.supabase.co/rest/v1/tasks?on_conflict=day_id,app_id",
      "https://test-project.supabase.co/rest/v1/user_data?on_conflict=user_id",
    ]);

    for (const [, options] of global.fetch.mock.calls) {
      expect(options.keepalive).toBe(true);
      expect(options.headers.apikey).toBe("test-anon-key");
      expect(options.headers.Authorization).toBe("Bearer jwt-token");
      expect(options.headers.Prefer).toContain("resolution=merge-duplicates");
    }

    const taskBody = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(taskBody[0]).toMatchObject({ day_id: 10, app_id: 101, carry_count: 2 });
  });

  it("skips task rows for days whose id is not cached", async () => {
    // No cache seeding — day id unknown, so only days + user_data go out.
    flushPushKeepalive({
      userId: "user-1",
      accessToken: "jwt-token",
      weekSchedules,
      changedWeekKeys: ["2026-W28"],
      userData: {},
    });

    const urls = global.fetch.mock.calls.map(([url]) => url);
    expect(urls.some((u) => u.includes("/tasks"))).toBe(false);
    expect(urls.some((u) => u.includes("/days"))).toBe(true);
    expect(urls.some((u) => u.includes("/user_data"))).toBe(true);
  });

  it("does nothing without a user id or access token", () => {
    flushPushKeepalive({ userId: null, accessToken: "t", weekSchedules, changedWeekKeys: ["2026-W28"] });
    flushPushKeepalive({ userId: "user-1", accessToken: null, weekSchedules, changedWeekKeys: ["2026-W28"] });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("ignores week keys that have no days array", () => {
    flushPushKeepalive({
      userId: "user-1",
      accessToken: "t",
      weekSchedules: {},
      changedWeekKeys: ["2026-W99"],
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
