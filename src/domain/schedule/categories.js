import { CATEGORY_KEYS, DEFAULT_COLORS } from "./constants";

const CATEGORY_MATCHERS = [
  { value: "sleep", keywords: ["نوم", "sleep", "قيلولة", "nap"] },
  {
    value: "commute_buffer",
    keywords: ["تحرك", "buffer", "انتقال", "commute", "مواصلات", "للأوفيس", "للاوفيس", "للبيت"],
  },
  { value: "planning_review", keywords: ["مراجعة", "تخطيط", "تقييم", "review", "plan", "planning"] },
  {
    value: "rest_nutrition",
    keywords: ["فطار", "افطار", "أكل", "اكل", "قهوة", "راحة", "غدا", "غداء", "عشاء", "استراحة", "سناك"],
  },
  {
    value: "quran_study",
    keywords: ["حفظ قرآن", "تسميع قرآن", "قرآن سماع", "سماع قرآن", "قرآن", "quran", "تسميع", "حفظ"],
  },
  { value: "worship", keywords: ["صلاة", "أذكار", "اذكار", "درس الشيخ", "دعاء", "ذكر", "ورد"] },
  { value: "sports_fitness", keywords: ["ركوب العجلة", "العجلة", "عجلة", "تمارين", "رياضة", "جيم", "مشي", "جري"] },
  { value: "education", keywords: ["إنجليزي", "انجليزي", "english", "anki", "قراءة", "تعلم", "تعليم", "study"] },
  { value: "tech_projects", keywords: ["api design", "api", "oic", "برمجة", "coding", "code", "tech"] },
  { value: "personal_projects", keywords: ["lh2l", "مشروع شخصي", "مشاريع ذاتية", "personal project"] },
];

const LEGACY_CATEGORY_MAP = {
  ibadah: "worship",
  buffer: "commute_buffer",
};

const CATEGORY_KEYS_SET = new Set(CATEGORY_KEYS);

function pickCategoryFromTaskName(taskName = "") {
  const normalizedName = String(taskName).toLowerCase();

  const match = CATEGORY_MATCHERS.find(({ keywords }) =>
    keywords.some((keyword) => normalizedName.includes(keyword.toLowerCase())),
  );

  return match?.value || "";
}

export function normalizeTaskCategory(task = {}) {
  if (CATEGORY_KEYS_SET.has(task.cat)) {
    return task.cat;
  }

  const keywordCategory = pickCategoryFromTaskName(task.task);
  if (keywordCategory) {
    return keywordCategory;
  }

  return LEGACY_CATEGORY_MAP[task.cat] || "";
}

export function normalizeTask(task = {}) {
  return {
    ...task,
    cat: normalizeTaskCategory(task),
  };
}

export function normalizeDaysCategories(days = []) {
  return days.map((day) => ({
    ...day,
    tasks: Array.isArray(day.tasks) ? day.tasks.map(normalizeTask) : [],
  }));
}

export function normalizeColors(colors = {}) {
  const normalized = Object.fromEntries(
    Object.entries(DEFAULT_COLORS).map(([key, value]) => [key, { ...value }]),
  );

  if (!colors || typeof colors !== "object") {
    return normalized;
  }

  const copyColor = (fromKey, toKeys) => {
    const source = colors[fromKey];
    if (!source) return;

    toKeys.forEach((targetKey) => {
      if (!colors[targetKey]) {
        normalized[targetKey] = {
          ...normalized[targetKey],
          ...source,
        };
      }
    });
  };

  copyColor("ibadah", ["worship", "quran_study"]);
  copyColor("highlight", [
    "sports_fitness",
    "education",
    "tech_projects",
    "personal_projects",
    "planning_review",
    "sleep",
  ]);
  copyColor("buffer", ["commute_buffer"]);

  Object.entries(colors).forEach(([key, value]) => {
    if (!normalized[key] || !value) return;

    normalized[key] = {
      ...normalized[key],
      ...value,
    };
  });

  return normalized;
}
