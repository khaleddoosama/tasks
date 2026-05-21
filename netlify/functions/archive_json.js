// Netlify Function — /archive_json?from=YYYY-MM-DD&to=YYYY-MM-DD
// Fetches schedule data from GitHub Gist and returns a clean denormalized JSON
// suitable for archiving or feeding to an AI model.
//
// Required Netlify env vars:
//   GIST_ID    — the ID of your GitHub Gist
//   GIST_TOKEN — a GitHub personal access token with gist scope

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
  const weeklyGoalTitleMap   = buildWeeklyGoalTitleMap(weeklyGoalsStore);
  const monthlyGoalTitleMap  = buildMonthlyGoalTitleMap(monthlyGoalsStore);

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
    ...(day.notes              ? { notes:       day.notes }                          : {}),
    ...(ENERGY_LABELS[day.مستوى_الطاقة]  ? { energyLevel: ENERGY_LABELS[day.مستوى_الطاقة] }  : {}),
    ...(RATING_LABELS[day.تقييم_اليوم]   ? { dayRating:   RATING_LABELS[day.تقييم_اليوم] }   : {}),
    ...(day.عدد_ساعات_النوم   ? { sleepHours:  day.عدد_ساعات_النوم }                : {}),
    ...(day.عدد_ساعات_الهاتف  ? { phoneHours:  day.عدد_ساعات_الهاتف }               : {}),
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

  const gistId    = process.env.GIST_ID;
  const gistToken = process.env.GIST_TOKEN;

  if (!gistId || !gistToken) {
    return json(500, { error: "GIST_ID و GIST_TOKEN غير محددَين في بيئة Netlify" });
  }

  let appData;
  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: { Authorization: `token ${gistToken}` },
    });
    if (!res.ok) {
      return json(502, { error: `GitHub Gist error: ${res.status}` });
    }
    const gist    = await res.json();
    const content = gist.files["todo-app-data.json"]?.content;
    if (!content) {
      return json(404, { error: "الملف todo-app-data.json غير موجود في الـ Gist" });
    }
    appData = JSON.parse(content);
  } catch (err) {
    return json(502, { error: `فشل جلب البيانات: ${err.message}` });
  }

  const archive = buildArchive({
    weekSchedules:     appData.weekSchedules  || {},
    monthlyGoalsStore: appData.monthlyGoals   || {},
    weeklyGoalsStore:  appData.weeklyGoals    || {},
    fromDate,
    toDate,
  });

  return json(200, archive);
};
