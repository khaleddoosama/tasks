// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/supabaseClient", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("../services/cloudStore", () => ({
  fetchAllWeeks: vi.fn(),
  fetchUserData: vi.fn(),
  flushPushKeepalive: vi.fn(),
  hasAnyData: vi.fn(),
  upsertUserData: vi.fn(),
  upsertWeek: vi.fn(),
}));

import { supabase } from "../services/supabaseClient";
import {
  fetchAllWeeks,
  fetchUserData,
  flushPushKeepalive,
  hasAnyData,
  upsertUserData,
  upsertWeek,
} from "../services/cloudStore";
import { useSupabaseSync } from "./useSupabaseSync";

const weekA = [{ id: 1, name: "السبت", tasks: [] }];
const weekB = [{ id: 1, name: "السبت", tasks: [{ id: 5, task: "جديدة" }] }];

function makePayload(weekSchedules) {
  return {
    weekSchedules,
    colors: null,
    selectedWeek: 28,
    monthlyGoals: {},
    weeklyGoals: {},
    templates: {},
    generalNotes: [],
    darkMode: false,
  };
}

let authCallback;

// Renders the hook, signs a user in, and completes the initial pull.
// onDataMerged echoes back the pulled week references as appliedWeekSchedules,
// the way usePlannerState.applyPlannerData does after a restore.
async function renderSignedIn(initialPayload, onDataMerged) {
  const view = renderHook(({ payload }) => useSupabaseSync(payload, onDataMerged), {
    initialProps: { payload: initialPayload },
  });
  await act(async () => {
    await authCallback("SIGNED_IN", { user: { id: "user-1" }, access_token: "jwt-token" });
  });
  return view;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  supabase.auth.onAuthStateChange.mockImplementation((callback) => {
    authCallback = callback;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
  fetchAllWeeks.mockResolvedValue({ data: { "2026-W28": weekA }, error: null });
  fetchUserData.mockResolvedValue({ data: null, error: null });
  hasAnyData.mockResolvedValue(true);
  upsertWeek.mockResolvedValue({ error: null });
  upsertUserData.mockResolvedValue({ error: null });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("login / pull", () => {
  it("pulls cloud data on sign-in and hands it to onDataMerged", async () => {
    const onDataMerged = vi.fn();
    const { result } = await renderSignedIn(makePayload({}), onDataMerged);

    expect(fetchAllWeeks).toHaveBeenCalledWith("user-1");
    expect(fetchUserData).toHaveBeenCalledWith("user-1");
    expect(onDataMerged).toHaveBeenCalledWith(
      expect.objectContaining({ weekSchedules: { "2026-W28": weekA } }),
    );
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.needsMigration).toBe(false);
  });

  it("flags needsMigration when the cloud is empty", async () => {
    hasAnyData.mockResolvedValue(false);
    const { result } = await renderSignedIn(makePayload({}), vi.fn());
    expect(result.current.needsMigration).toBe(true);
  });

  it("reports a failed pull without throwing", async () => {
    fetchAllWeeks.mockResolvedValue({ data: null, error: new Error("network down") });
    const onDataMerged = vi.fn();
    const { result } = await renderSignedIn(makePayload({}), onDataMerged);

    expect(onDataMerged).not.toHaveBeenCalled();
    expect(result.current.syncStatus).toBe("failed");
    expect(result.current.syncError).toBe("network down");
  });
});

describe("debounced auto-push", () => {
  it("pushes only weeks whose reference changed since the pull", async () => {
    const onDataMerged = vi.fn(() => ({ appliedWeekSchedules: { "2026-W28": weekA } }));
    const { rerender } = await renderSignedIn(makePayload({ "2026-W28": weekA }), onDataMerged);

    // W28 keeps the pulled reference; W29 is new → only W29 should upload.
    rerender({ payload: makePayload({ "2026-W28": weekA, "2026-W29": weekB }) });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(upsertWeek).toHaveBeenCalledTimes(1);
    expect(upsertWeek).toHaveBeenCalledWith("user-1", "2026-W29", weekB);
    expect(upsertUserData).toHaveBeenCalledTimes(1);
  });

  it("pushes nothing week-wise when references are unchanged", async () => {
    const onDataMerged = vi.fn(() => ({ appliedWeekSchedules: { "2026-W28": weekA } }));
    const { rerender } = await renderSignedIn(makePayload({ "2026-W28": weekA }), onDataMerged);

    // Same week references, only user data (e.g. dark mode) changed.
    rerender({ payload: { ...makePayload({ "2026-W28": weekA }), darkMode: true } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(upsertWeek).not.toHaveBeenCalled();
    expect(upsertUserData).toHaveBeenCalledTimes(1);
  });

  it("does not re-upload an already-pushed week on the next push", async () => {
    const onDataMerged = vi.fn(() => ({ appliedWeekSchedules: { "2026-W28": weekA } }));
    const { rerender } = await renderSignedIn(makePayload({ "2026-W28": weekA }), onDataMerged);

    rerender({ payload: makePayload({ "2026-W28": weekA, "2026-W29": weekB }) });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500); // push W29
      await vi.advanceTimersByTimeAsync(3000); // release isPushing guard
    });
    upsertWeek.mockClear();

    const weekC = [{ id: 2, name: "الأحد", tasks: [] }];
    rerender({ payload: makePayload({ "2026-W28": weekA, "2026-W29": weekB, "2026-W30": weekC }) });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(upsertWeek).toHaveBeenCalledTimes(1);
    expect(upsertWeek).toHaveBeenCalledWith("user-1", "2026-W30", weekC);
  });
});

describe("unload flush", () => {
  it("flushes a pending debounced push via keepalive on beforeunload", async () => {
    const onDataMerged = vi.fn(() => ({ appliedWeekSchedules: { "2026-W28": weekA } }));
    const { rerender } = await renderSignedIn(makePayload({ "2026-W28": weekA }), onDataMerged);

    rerender({ payload: makePayload({ "2026-W28": weekA, "2026-W29": weekB }) });
    // Close the tab before the 1.5s debounce fires.
    act(() => {
      window.dispatchEvent(new Event("beforeunload", { cancelable: true }));
    });

    expect(flushPushKeepalive).toHaveBeenCalledTimes(1);
    expect(flushPushKeepalive).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        accessToken: "jwt-token",
        changedWeekKeys: ["2026-W29"],
      }),
    );

    // The debounce timer was consumed — no duplicate normal push afterwards.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(upsertWeek).not.toHaveBeenCalled();
  });

  it("does nothing on unload when no push is pending", async () => {
    await renderSignedIn(makePayload({ "2026-W28": weekA }), vi.fn(() => ({
      appliedWeekSchedules: { "2026-W28": weekA },
    })));

    act(() => {
      window.dispatchEvent(new Event("beforeunload", { cancelable: true }));
    });
    expect(flushPushKeepalive).not.toHaveBeenCalled();
  });

  it("also flushes on pagehide (mobile browsers)", async () => {
    const onDataMerged = vi.fn(() => ({ appliedWeekSchedules: { "2026-W28": weekA } }));
    const { rerender } = await renderSignedIn(makePayload({ "2026-W28": weekA }), onDataMerged);

    rerender({ payload: makePayload({ "2026-W28": weekA, "2026-W29": weekB }) });
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });

    expect(flushPushKeepalive).toHaveBeenCalledTimes(1);
  });
});

describe("signOut", () => {
  it("clears the user and resets sync state", async () => {
    const { result } = await renderSignedIn(makePayload({}), vi.fn());

    await act(async () => {
      await result.current.signOut();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.needsMigration).toBe(false);
  });
});
