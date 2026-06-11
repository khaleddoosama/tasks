// Netlify Function — /archive_json?from=YYYY-MM-DD&to=YYYY-MM-DD
// Fetches schedule data from Supabase and returns a clean denormalized JSON
// suitable for archiving or feeding to an AI model.
//
// Required Netlify env vars:
//   SUPABASE_URL          — your Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS — keep secret)

const { createClient } = require("@supabase/supabase-js");

// ---- Constants (mirrored from src/domain/schedule/constants.js) ----

const CATEGORY_META = {
  worship:         { icon: "🕌", label: "عبادة" },
  quran_study:     { icon: "📖", label: "دراسة القرآن" },
  sports_fitness:  { icon: "🚴", label: "الرياضة واللياقة" },
  rest_nutrition:  { icon: "☕", label: "الراحة والتغذية" },
  education:       { icon: "🎓", label: "التعليم واللغات" },
  tech_projects:   { icon: "💻", label: "المشاريع التقنية" },
  personal_projects: { icon: "🛠️", label: "المشاريع الشخصية" },
  relationships:   { icon: "🤝", label: "العلاقات" },
  commute_buffer:  { icon: "🚌", label: "الانتقال والوقت الاحتياطي" },
  planning_review: { icon: "📝", label: "التخطيط والمراجعة" },
  sleep:           { icon: "😴", label: "النوم" },
};

const ENERGY_LABELS = {
  "1": "منخفضة جدا 😴",
  "2": "منخفضة 😐",
  "3": "متوسطة 😊",
  "4": "عالية 😄",
  "5": "عالية جدا 🔥",
};

const RATING_LABELS = {
  "1": "سيء جدا 😞",
  "2": "سيء 😕",
  "3": "جيد 😐",
  "4": "جيد جدا 😊",
  "5": "ممتاز 🌟",
};

// ---- Helpers ----

function normalizeDate(raw) {
  return raw ? raw.replace(/\//g, "-") : "";
}

function buildWeeklyGoalTitleMap(weeklyGoalsStore = {}) {
  const map = {};
  Object.values(weeklyGoalsStore).forEach((weekGoals) => {
    Object.values(weekGoals || {}).forEach((goal) => {
      if (goal?.id) map[goal.id] = goal.title || goal.id;
    });
  });
  return map;
}

function buildMonthlyGoalTitleMap(monthlyGoalsStore = {}) {
  const map = {};
  Object.values(monthlyGoalsStore).forEach((monthGoals) => {
    Object.values(monthGoals || {}).forEach((goal) => {
      if (goal?.id) map[goal.id] = goal.title || goal.id;
    });
  });
  return map;
}

function resolveTask(task, weeklyGoalTitleMap, monthlyGoalTitleMap) {
  const catMeta = CATEGORY_META[task.cat];
  const resolved = {
    time: task.time || "",
    task: task.task || "",
    category: catMeta ? `${catMeta.icon} ${catMeta.label}` : "بدون تصنيف",
    status: task.done ? "مكتملة" : "لم تكتمل",
  };

  const weeklyGoal = task.linkedWeeklyGoalId ? weeklyGoalTitleMap[task.linkedWeeklyGoalId] : null;
  const monthlyGoal = task.linkedMonthlyGoalId ? monthlyGoalTitleMap[task.linkedMonthlyGoalId] : null;

  if (weeklyGoal)  resolved.weeklyGoal  = weeklyGoal;
  if (monthlyGoal) resolved.monthlyGoal = monthlyGoal;
  if (task.notes)  resolved.notes       = task.notes;

  return resolved;
}

function buildArchive({ weekSchedules, monthlyGoalsStore, weeklyGoalsStore, fromDate, toDate }) {
  const weeklyGoalTitleMap  = buildWeeklyGoalTitleMap(weeklyGoalsStore);
  const monthlyGoalTitleMap = buildMonthlyGoalTitleMap(monthlyGoalsStore);

  const matchingDays = Object.values(weekSchedules)
    .flat()
    .filter((day) => {
      const date = day?.التاريخ;
      return date && date >= fromDate && date <= toDate && day.enabled !== false;
    })
    .sort((a, b) => a.التاريخ.localeCompare(b.التاريخ));

  const days = matchingDays.map((day) => ({
    date:    day.التاريخ,
    dayName: day.name || "",
    type:    day.type || "",
    ...(day.notes                         ? { notes:       day.notes }                          : {}),
    ...(ENERGY_LABELS[day.مستوى_الطاقة]  ? { energyLevel: ENERGY_LABELS[day.مستوى_الطاقة] }  : {}),
    ...(RATING_LABELS[day.تقييم_اليوم]   ? { dayRating:   RATING_LABELS[day.تقييم_اليوم] }   : {}),
    ...(day.عدد_ساعات_النوم              ? { sleepHours:  day.عدد_ساعات_النوم }               : {}),
    ...(day.عدد_ساعات_الهاتف             ? { phoneHours:  day.عدد_ساعات_الهاتف }              : {}),
    tasks: (day.tasks || []).map((task) =>
      resolveTask(task, weeklyGoalTitleMap, monthlyGoalTitleMap)
    ),
  }));

  return {
    exportedAt: new Date().toISOString().slice(0, 10),
    dateRange:  { from: fromDate, to: toDate },
    totalDays:  days.length,
    totalTasks: days.reduce((sum, d) => sum + d.tasks.length, 0),
    days,
  };
}

// ---- Handler ----

exports.handler = async function (event) {
  const params   = event.queryStringParameters || {};
  const fromDate = normalizeDate(params.from);
  const toDate   = normalizeDate(params.to);

  const json = (statusCode, data) => ({
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(data, null, 2),
  });

  if (!fromDate || !toDate) {
    return json(400, { error: "مطلوب from و to — مثال: ?from=2026-05-01&to=2026-05-07" });
  }
  if (fromDate > toDate) {
    return json(400, { error: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية" });
  }

  const supabaseUrl     = process.env.SUPABASE_URL;
  const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY غير محددَين في بيئة Netlify" });
  }

  let weekSchedules = {};
  let monthlyGoalsStore = {};
  let weeklyGoalsStore  = {};

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const [weeksResult, userDataResult] = await Promise.all([
      supabase.from("weeks").select("week_key, data"),
      supabase.from("user_data").select("monthly_goals, weekly_goals").limit(1).maybeSingle(),
    ]);

    if (weeksResult.error)    throw weeksResult.error;
    if (userDataResult.error) throw userDataResult.error;

    for (const row of weeksResult.data || []) {
      weekSchedules[row.week_key] = row.data;
    }

    if (userDataResult.data) {
      monthlyGoalsStore = userDataResult.data.monthly_goals || {};
      weeklyGoalsStore  = userDataResult.data.weekly_goals  || {};
    }
  } catch (err) {
    return json(502, { error: `فشل جلب البيانات من Supabase: ${err.message}` });
  }

  const archive = buildArchive({ weekSchedules, monthlyGoalsStore, weeklyGoalsStore, fromDate, toDate });

  return json(200, archive);
};
