import { supabase } from "./supabaseClient";

// ── Weeks ──────────────────────────────────────────────────────────────────

export async function upsertWeek(userId, weekKey, daysArray) {
  return supabase.from("weeks").upsert({
    user_id: userId,
    week_key: weekKey,
    data: daysArray,
    updated_at: new Date().toISOString(),
  });
}

export async function fetchAllWeeks(userId) {
  const { data, error } = await supabase
    .from("weeks")
    .select("week_key, data")
    .eq("user_id", userId);

  if (error) return { data: null, error };

  const weekSchedules = {};
  for (const row of data || []) {
    weekSchedules[row.week_key] = row.data;
  }
  return { data: weekSchedules, error: null };
}

// ── User data (colors, goals, templates, notes, settings) ─────────────────

export async function upsertUserData(userId, payload) {
  return supabase.from("user_data").upsert({
    user_id: userId,
    colors: payload.colors,
    dark_mode: payload.darkMode ?? payload.dark_mode ?? false,
    selected_week: payload.selectedWeek ?? payload.selected_week ?? null,
    monthly_goals: payload.monthlyGoals ?? payload.monthly_goals ?? {},
    weekly_goals: payload.weeklyGoals ?? payload.weekly_goals ?? {},
    templates: payload.templates ?? {},
    general_notes: payload.generalNotes ?? payload.general_notes ?? [],
    updated_at: new Date().toISOString(),
  });
}

export async function fetchUserData(userId) {
  return supabase
    .from("user_data")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
}

// ── Check if user has any data stored ─────────────────────────────────────

export async function hasAnyData(userId) {
  const { data } = await supabase
    .from("weeks")
    .select("week_key")
    .eq("user_id", userId)
    .limit(1);
  return (data || []).length > 0;
}
