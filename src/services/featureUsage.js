// Feature usage log — counts how often each feature is used and when it was
// last used, so unused features can be spotted (and deleted) in the monthly
// review. Stored in localStorage (offline cache) and synced to the
// user_data.feature_usage jsonb column through the normal Supabase push.
//
// Shape: { [featureKey]: { count: number, lastUsedAt: ISO string } }

const FEATURE_USAGE_KEY = "featureUsageV1";

// Registry of tracked features → Arabic labels. Every key here shows up in
// the usage panel even if it was never used ("لم تُستخدم") — that's the whole
// point: unused features must be visible, not absent.
export const FEATURE_LABELS = {
  "tab:notes": "📝 تاب الملاحظات",
  "tab:goals": "🎯 تاب الأهداف",
  "tab:goalStats": "📊 تاب إحصائيات الأهداف",
  "tab:colors": "🎨 تاب الألوان",
  "shortcut:undo": "↶ تراجع (Ctrl+Z)",
  "shortcut:redo": "↷ إعادة (Ctrl+Y)",
  "export:schedule": "⬇️ تصدير JSON",
  "import:schedule": "⬆️ استيراد JSON",
  "export:archive": "📦 تصدير الأرشيف",
  "template:save": "💾 حفظ قالب يوم",
  "template:apply": "📥 تطبيق قالب يوم",
  "template:manage": "⚙️ إدارة القوالب",
  "task:carry": "⏭ ترحيل مهمة لبكرة",
  "week:copyPrevious": "📋 نسخ الأسبوع السابق",
  "goal:addMonthly": "🗓️ إضافة هدف شهري",
  "goal:addWeekly": "📅 إضافة هدف أسبوعي",
  "darkMode:toggle": "🌙 تبديل الوضع الليلي",
};

function isValidEntry(entry) {
  return (
    entry &&
    typeof entry === "object" &&
    Number.isFinite(Number(entry.count)) &&
    typeof entry.lastUsedAt === "string"
  );
}

export function readFeatureUsage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FEATURE_USAGE_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, entry]) => isValidEntry(entry)));
  } catch {
    return {};
  }
}

export function writeFeatureUsage(usage) {
  try {
    localStorage.setItem(FEATURE_USAGE_KEY, JSON.stringify(usage));
  } catch {
    // localStorage full/unavailable — usage tracking is best-effort
  }
}

// Increments a feature's counter and stamps now. Reads the freshest state
// from localStorage (not the caller's copy) so rapid calls don't lose counts.
export function recordFeatureUse(key) {
  const usage = readFeatureUsage();
  const current = usage[key];
  const next = {
    ...usage,
    [key]: {
      count: (current ? Number(current.count) : 0) + 1,
      lastUsedAt: new Date().toISOString(),
    },
  };
  writeFeatureUsage(next);
  return next;
}

// Multi-device merge: per key take the larger count and the most recent
// lastUsedAt. Counts are per-device tallies, so max (not sum) avoids double
// counting the same events pushed back and forth.
export function mergeFeatureUsage(local = {}, remote = {}) {
  const merged = { ...local };
  for (const [key, remoteEntry] of Object.entries(remote)) {
    if (!isValidEntry(remoteEntry)) continue;
    const localEntry = merged[key];
    if (!isValidEntry(localEntry)) {
      merged[key] = remoteEntry;
      continue;
    }
    merged[key] = {
      count: Math.max(Number(localEntry.count), Number(remoteEntry.count)),
      lastUsedAt:
        localEntry.lastUsedAt >= remoteEntry.lastUsedAt
          ? localEntry.lastUsedAt
          : remoteEntry.lastUsedAt,
    };
  }
  return merged;
}

// Days since the feature was last used, or null if never.
export function daysSinceLastUse(entry, now = new Date()) {
  if (!isValidEntry(entry)) return null;
  const last = new Date(entry.lastUsedAt);
  if (Number.isNaN(last.getTime())) return null;
  return Math.max(0, Math.floor((now - last) / 86400000));
}
