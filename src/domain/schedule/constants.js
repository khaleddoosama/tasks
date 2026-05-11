export const LS_KEY = "weekScheduleV2";
export const WEEK_SCHEDULES_KEY = "weekSchedulesV1";
export const DARK_MODE_KEY = "darkMode";
export const WEEKLY_GOALS_KEY = "weeklyGoals";
export const MONTHLY_GOALS_KEY = "monthlyGoals";
export const DEFAULT_GOAL_TARGET = 20;

export const CATEGORY_META = {
  worship: { icon: "🕌", label: "عبادة" },
  quran_study: { icon: "📖", label: "دراسة القرآن" },
  sports_fitness: { icon: "🚴", label: "الرياضة واللياقة" },
  rest_nutrition: { icon: "☕", label: "الراحة والتغذية" },
  education: { icon: "🎓", label: "التعليم واللغات" },
  tech_projects: { icon: "💻", label: "المشاريع التقنية" },
  personal_projects: { icon: "🛠️", label: "المشاريع الشخصية" },
  commute_buffer: { icon: "🚌", label: "الانتقال والوقت الاحتياطي" },
  planning_review: { icon: "📝", label: "التخطيط والمراجعة" },
  sleep: { icon: "😴", label: "النوم" },
};

export const CATEGORY_KEYS = Object.keys(CATEGORY_META);

export const DEFAULT_COLORS = {
  header: { bg: "#1a1a2e", text: "#ffffff" },
  worship: { bg: "#eefaf1", text: "#1e6e45" },
  quran_study: { bg: "#edf8ff", text: "#176087" },
  sports_fitness: { bg: "#fff3e8", text: "#b85d0d" },
  rest_nutrition: { bg: "#fff8de", text: "#8a6a00" },
  education: { bg: "#f4efff", text: "#5f3bb3" },
  tech_projects: { bg: "#eaf4ff", text: "#0f5ea8" },
  personal_projects: { bg: "#fff0f6", text: "#b83280" },
  commute_buffer: { bg: "#f3f4f6", text: "#4b5563" },
  planning_review: { bg: "#ecfdf5", text: "#047857" },
  sleep: { bg: "#eef2ff", text: "#4338ca" },
};

export const CAT_LABELS = {
  "": "بدون تصنيف",
  ...Object.fromEntries(
    Object.entries(CATEGORY_META).map(([key, meta]) => [key, `${meta.icon} ${meta.label}`]),
  ),
};

export const CATEGORY_CHECKBOX_EXCLUSIONS = ["commute_buffer"];

export const GOALS = ["PLSQL", "OIC", "McKinsey", "english", "quran", "cycling"];

export const GOAL_KEYWORDS = {
  PLSQL: ["PLSQL"],
  OIC: ["OIC"],
  McKinsey: ["McKinsey"],
  english: ["إنجليزي", "انجليزي", "english"],
  quran: ["قرآن", "تسميع", "حفظ قرآن"],
  cycling: ["عجلة", "ركوب"],
};

export const GOAL_COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"];
