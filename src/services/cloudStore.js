import { supabase } from "./supabaseClient";

// ── Weeks (reads/writes days + tasks tables) ───────────────────────────────

export async function upsertWeek(userId, weekKey, daysArray) {
  for (let dayIndex = 0; dayIndex < daysArray.length; dayIndex++) {
    const day = daysArray[dayIndex];

    // Upsert day row
    const { data: dayRows, error: dayErr } = await supabase
      .from("days")
      .upsert({
        user_id:     userId,
        week_key:    weekKey,
        day_index:   dayIndex,
        name:        day.name                    ?? null,
        date:        day["التاريخ"]             ?? null,
        type:        day.type                    ?? null,
        notes:       day.notes                   ?? null,
        enabled:     day.enabled                 ?? true,
        energy_log:  Array.isArray(day.energyLog) ? day.energyLog : [],
        rating:      day["تقييم_اليوم"]          ?? null,
        sleep_hours: day["عدد_ساعات_النوم"]      ?? null,
        phone_hours: day["عدد_ساعات_الهاتف"]     ?? null,
        updated_at:  new Date().toISOString(),
      }, { onConflict: "user_id,week_key,day_index" })
      .select("id")
      .single();

    if (dayErr) return { error: dayErr };

    const dayId = dayRows.id;
    const tasks = Array.isArray(day.tasks) ? day.tasks : [];

    // Upsert tasks using (day_id, app_id) as stable key — preserves notes across pushes
    if (tasks.length > 0) {
      const taskPayloads = tasks.map((t, i) => ({
        user_id:                userId,
        day_id:                 dayId,
        app_id:                 t.id,
        task_order:             i * 10,
        time:                   t.time                ?? null,
        task:                   t.task                ?? null,
        cat:                    t.cat                 ?? null,
        done:                   t.done                ?? false,
        recurring:              t.recurring           ?? false,
        notes:                  t.notes               ?? null,
        linked_weekly_goal_id:  t.linkedWeeklyGoalId  ?? null,
        linked_monthly_goal_id: t.linkedMonthlyGoalId ?? null,
        linked_goal_type:       t.linkedGoalType      ?? null,
        linked_goal_id:         t.linkedGoalId        ?? null,
        updated_at:             new Date().toISOString(),
      }));

      const { error: taskErr } = await supabase
        .from("tasks")
        .upsert(taskPayloads, { onConflict: "day_id,app_id" });
      if (taskErr) return { error: taskErr };
    }

    // Delete tasks removed from the app (app_id no longer in the list)
    const currentAppIds = tasks.map((t) => t.id).filter(Boolean);
    if (currentAppIds.length > 0) {
      await supabase
        .from("tasks")
        .delete()
        .eq("day_id", dayId)
        .not("app_id", "in", `(${currentAppIds.join(",")})`);
    } else {
      await supabase.from("tasks").delete().eq("day_id", dayId);
    }
  }

  return { error: null };
}

export async function fetchAllWeeks(userId) {
  // Fetch all days for this user
  const { data: daysRows, error: daysErr } = await supabase
    .from("days")
    .select("*")
    .eq("user_id", userId)
    .order("day_index", { ascending: true });

  if (daysErr) return { data: null, error: daysErr };
  if (!daysRows || daysRows.length === 0) return { data: {}, error: null };

  // Fetch all tasks for this user
  const { data: taskRows, error: taskErr } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("task_order", { ascending: true });

  if (taskErr) return { data: null, error: taskErr };

  // Group tasks by day_id
  const tasksByDay = {};
  for (const t of taskRows || []) {
    if (!tasksByDay[t.day_id]) tasksByDay[t.day_id] = [];
    tasksByDay[t.day_id].push({
      id:                   t.app_id ?? t.id,
      time:                 t.time                   ?? "",
      task:                 t.task                   ?? "",
      cat:                  t.cat                    ?? "",
      done:                 t.done                   ?? false,
      recurring:            t.recurring              ?? false,
      notes:                t.notes                  ?? "",
      linkedWeeklyGoalId:   t.linked_weekly_goal_id  ?? "",
      linkedMonthlyGoalId:  t.linked_monthly_goal_id ?? "",
      linkedGoalType:       t.linked_goal_type        ?? "",
      linkedGoalId:         t.linked_goal_id          ?? "",
    });
  }

  // Reconstruct weekSchedules in the original shape the app expects
  const weekSchedules = {};
  for (const d of daysRows) {
    if (!weekSchedules[d.week_key]) weekSchedules[d.week_key] = [];
    const energyLog = Array.isArray(d.energy_log) ? d.energy_log : [];
    weekSchedules[d.week_key].push({
      id:                   d.day_index,
      name:                 d.name        ?? "",
      "التاريخ":            d.date        ?? "",
      type:                 d.type        ?? "",
      notes:                d.notes       ?? "",
      enabled:              d.enabled     ?? true,
      energyLog:            energyLog,
      "تقييم_اليوم":        d.rating      ?? "",
      "عدد_ساعات_النوم":    d.sleep_hours ?? "",
      "عدد_ساعات_الهاتف":   d.phone_hours ?? "",
      tasks:                tasksByDay[d.id] ?? [],
    });
  }

  return { data: weekSchedules, error: null };
}

// ── User data (colors, goals, templates, notes, settings) ─────────────────

export async function upsertUserData(userId, payload) {
  return supabase.from("user_data").upsert({
    user_id:       userId,
    colors:        payload.colors,
    dark_mode:     payload.darkMode      ?? payload.dark_mode      ?? false,
    selected_week: payload.selectedWeek  ?? payload.selected_week  ?? null,
    monthly_goals: payload.monthlyGoals  ?? payload.monthly_goals  ?? {},
    weekly_goals:  payload.weeklyGoals   ?? payload.weekly_goals   ?? {},
    templates:     payload.templates     ?? {},
    general_notes: payload.generalNotes  ?? payload.general_notes  ?? [],
    updated_at:    new Date().toISOString(),
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
    .from("days")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  return (data || []).length > 0;
}
