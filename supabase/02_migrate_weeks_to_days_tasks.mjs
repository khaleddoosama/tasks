/**
 * Migration script: weeks.data (JSONB) → days + tasks tables
 * Run: node supabase/02_migrate_weeks_to_days_tasks.mjs
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function api(path, method = 'GET', body) {
  const res = await fetch(SUPABASE_URL + '/rest/v1' + path, {
    method,
    headers: { ...headers, ...(method !== 'GET' ? { Prefer: 'return=representation' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  // 1. Fetch all weeks
  const weeks = await api('/weeks?select=user_id,week_key,data');
  console.log(`Found ${weeks.length} week rows to migrate`);

  let dayCount = 0, taskCount = 0;

  for (const row of weeks) {
    const { user_id, week_key, data: daysArray } = row;
    if (!Array.isArray(daysArray)) continue;

    for (let dayIndex = 0; dayIndex < daysArray.length; dayIndex++) {
      const day = daysArray[dayIndex];

      // 2. Upsert day row
      const dayPayload = {
        user_id,
        week_key,
        day_index:   dayIndex,
        name:        day.name        ?? null,
        date:        day['التاريخ'] ?? null,
        type:        day.type        ?? null,
        notes:       day.notes       ?? null,
        enabled:     day.enabled     ?? true,
        energy:      day['مستوى_الطاقة']      ?? null,
        rating:      day['تقييم_اليوم']       ?? null,
        sleep_hours: day['عدد_ساعات_النوم']   ?? null,
        phone_hours: day['عدد_ساعات_الهاتف']  ?? null,
        updated_at:  new Date().toISOString(),
      };

      const [dayRow] = await api(
        '/days?on_conflict=user_id,week_key,day_index',
        'POST',
        dayPayload,
      );
      dayCount++;

      // 3. Delete existing tasks for this day (clean upsert)
      await api(`/tasks?day_id=eq.${dayRow.id}`, 'DELETE');

      // 4. Insert tasks
      const tasks = Array.isArray(day.tasks) ? day.tasks : [];
      if (tasks.length === 0) continue;

      const taskPayloads = tasks.map((t, i) => ({
        user_id,
        day_id:                 dayRow.id,
        task_order:             i * 10,
        time:                   t.time                   ?? null,
        task:                   t.task                   ?? null,
        cat:                    t.cat                    ?? null,
        done:                   t.done                   ?? false,
        recurring:              t.recurring              ?? false,
        linked_weekly_goal_id:  t.linkedWeeklyGoalId     ?? null,
        linked_monthly_goal_id: t.linkedMonthlyGoalId    ?? null,
        linked_goal_type:       t.linkedGoalType         ?? null,
        linked_goal_id:         t.linkedGoalId           ?? null,
        updated_at:             new Date().toISOString(),
      }));

      await api('/tasks', 'POST', taskPayloads);
      taskCount += taskPayloads.length;
    }
  }

  console.log(`✓ Migrated ${dayCount} days and ${taskCount} tasks`);
}

main().catch(err => { console.error(err); process.exit(1); });
