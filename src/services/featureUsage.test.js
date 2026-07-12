// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  daysSinceLastUse,
  mergeFeatureUsage,
  readFeatureUsage,
  recordFeatureUse,
} from "./featureUsage";

beforeEach(() => {
  localStorage.clear();
});

describe("recordFeatureUse / readFeatureUsage", () => {
  it("creates an entry with count 1 and a timestamp on first use", () => {
    const usage = recordFeatureUse("task:carry");
    expect(usage["task:carry"].count).toBe(1);
    expect(new Date(usage["task:carry"].lastUsedAt).getTime()).not.toBeNaN();
    expect(readFeatureUsage()).toEqual(usage);
  });

  it("increments the count on repeated use", () => {
    recordFeatureUse("tab:goals");
    recordFeatureUse("tab:goals");
    const usage = recordFeatureUse("tab:goals");
    expect(usage["tab:goals"].count).toBe(3);
  });

  it("returns {} for corrupt or invalid stored data", () => {
    localStorage.setItem("featureUsageV1", "not json{");
    expect(readFeatureUsage()).toEqual({});

    localStorage.setItem("featureUsageV1", JSON.stringify({ ok: { count: 1, lastUsedAt: "2026-07-01" }, bad: "x" }));
    expect(Object.keys(readFeatureUsage())).toEqual(["ok"]);
  });
});

describe("mergeFeatureUsage", () => {
  it("takes max count and latest lastUsedAt per key", () => {
    const local = { "tab:goals": { count: 5, lastUsedAt: "2026-07-10T10:00:00.000Z" } };
    const remote = { "tab:goals": { count: 3, lastUsedAt: "2026-07-12T10:00:00.000Z" } };
    expect(mergeFeatureUsage(local, remote)["tab:goals"]).toEqual({
      count: 5,
      lastUsedAt: "2026-07-12T10:00:00.000Z",
    });
  });

  it("keeps keys that exist on only one side and ignores invalid remote entries", () => {
    const local = { "task:carry": { count: 1, lastUsedAt: "2026-07-01T00:00:00.000Z" } };
    const remote = {
      "export:schedule": { count: 2, lastUsedAt: "2026-07-02T00:00:00.000Z" },
      broken: { nope: true },
    };
    const merged = mergeFeatureUsage(local, remote);
    expect(merged["task:carry"].count).toBe(1);
    expect(merged["export:schedule"].count).toBe(2);
    expect(merged.broken).toBeUndefined();
  });
});

describe("daysSinceLastUse", () => {
  const now = new Date("2026-07-12T12:00:00.000Z");

  it("returns whole days since last use", () => {
    expect(daysSinceLastUse({ count: 1, lastUsedAt: "2026-07-12T09:00:00.000Z" }, now)).toBe(0);
    expect(daysSinceLastUse({ count: 1, lastUsedAt: "2026-06-01T12:00:00.000Z" }, now)).toBe(41);
  });

  it("returns null for missing or invalid entries", () => {
    expect(daysSinceLastUse(undefined, now)).toBeNull();
    expect(daysSinceLastUse({ count: 1, lastUsedAt: "garbage" }, now)).toBeNull();
  });
});
