import { useMemo, useState } from "react";
import { calculateWeekStats } from "../../domain/schedule/stats";
import { FONT, RADIUS, SPACING, getTheme } from "../../theme/tokens";
import WeekTrends from "./WeekTrends";

const ENERGY_EMOJI = { 1: "😴", 2: "😐", 3: "🙂", 4: "😄", 5: "🔥" };
const RATING_EMOJI = { 1: "😞", 2: "😕", 3: "😐", 4: "😊", 5: "🌟" };

function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} د`;
  if (remainder === 0) return `${hours} س`;
  return `${hours} س ${remainder} د`;
}

function formatHours(value) {
  if (value === null || value === undefined) return "—";
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  if (minutes === 0) return `${hours} س`;
  return `${hours} س ${minutes} د`;
}

function StatCard({ label, value, sub, accent, theme }) {
  return (
    <div
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: RADIUS.lg,
        padding: "14px 16px",
        flex: "1 1 140px",
        minWidth: 140,
        boxShadow: theme.shadow,
      }}
    >
      <div style={{ fontSize: FONT.sm, color: theme.textMuted, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: FONT.stat, fontWeight: 900, color: accent || theme.text }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: theme.textFaint, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function CategoryTasksPanel({ category, days, colors, onClose, theme }) {
  const tasks = useMemo(() => {
    const result = [];
    days.forEach((day) => {
      if (!day.enabled) return;
      (day.tasks || []).forEach((task) => {
        if (task.cat === category.key) {
          result.push({ ...task, dayName: day.name });
        }
      });
    });
    return result;
  }, [category.key, days]);

  const barColor = colors[category.key]?.text || theme.accent;
  const done = tasks.filter((t) => t.done).length;

  return (
    <div style={{ flex: 1, minWidth: 0, background: theme.surfaceAlt, borderRadius: 10, padding: 14, border: `1px solid ${theme.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: theme.text }}>
          {category.icon} {category.label}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: FONT.sm, color: theme.textMuted }}>{done}/{tasks.length} مكتملة</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: theme.textFaint, lineHeight: 1, padding: 0 }}
            aria-label="إغلاق"
          >✕</button>
        </div>
      </div>
      {tasks.length === 0 ? (
        <p style={{ color: theme.textFaint, fontSize: FONT.md, margin: 0 }}>لا توجد مهام في هذا التصنيف.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: RADIUS.md,
                background: theme.surface,
                border: `1px solid ${theme.border}`,
                fontSize: FONT.sm,
              }}
            >
              <span style={{ fontSize: 14, color: task.done ? theme.success : theme.textFaint }}>{task.done ? "✔" : "○"}</span>
              <span style={{ flex: 1, color: task.done ? theme.textBody : theme.textFaint }}>
                {task.task}
              </span>
              {task.time && <span style={{ color: theme.textFaint, flexShrink: 0 }}>{task.time}</span>}
              <span style={{
                fontSize: FONT.xs,
                padding: "1px 6px",
                borderRadius: RADIUS.pill,
                background: barColor + "22",
                color: barColor,
                flexShrink: 0,
              }}>{task.dayName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StatsTab({ colors, days, weekRangeLabel, weeklyGoals = [], darkMode = false, weekSchedules, weekKey }) {
  const theme = getTheme(darkMode);
  const stats = useMemo(() => {
    // If weekly goals exist, calculate from them; otherwise from tasks
    if (weeklyGoals.length > 0) {
      const totalCompletion = weeklyGoals.reduce((s, g) => s + (g.completionRate || 0), 0);
      const avgCompletion = totalCompletion / weeklyGoals.length;
      const doneTasks = Math.round((avgCompletion / 100) * weeklyGoals.length);
      const totalTasks = weeklyGoals.length;
      const completionRate = Math.round(avgCompletion);
      return {
        ...calculateWeekStats(days),
        completionRate,
        doneTasks,
        totalTasks,
      };
    }
    return calculateWeekStats(days);
  }, [days, weeklyGoals]);

  const [selectedCategoryKey, setSelectedCategoryKey] = useState(null);
  const completionColor =
    stats.completionRate >= 80 ? theme.success : stats.completionRate >= 40 ? theme.warning : theme.danger;
  const maxCategoryMinutes = stats.categories[0]?.minutes || 1;
  const selectedCategory = stats.categories.find((c) => c.key === selectedCategoryKey) || null;

  return (
    <div style={{ padding: SPACING.xl, background: theme.pageBg, borderRadius: RADIUS.lg, direction: "rtl", color: theme.text }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.lg, flexWrap: "wrap", gap: SPACING.sm }}>
        <h2 style={{ margin: 0, fontSize: FONT.xl, fontWeight: 800, color: theme.text }}>📊 إحصائيات الأسبوع</h2>
        <span style={{ fontSize: FONT.sm, color: theme.textMuted }}>{weekRangeLabel}</span>
      </div>

      {/* Summary cards */}
      <div style={{ display: "flex", gap: SPACING.md, flexWrap: "wrap", marginBottom: SPACING.xxl }}>
        <StatCard
          theme={theme}
          label="نسبة الإنجاز"
          value={`${stats.completionRate}%`}
          sub={`${stats.doneTasks} من ${stats.totalTasks} مهمة`}
          accent={completionColor}
        />
        <StatCard theme={theme} label="إجمالي الوقت المجدوَل" value={formatMinutes(stats.totalMinutes)} />
        <StatCard
          theme={theme}
          label="متوسط الطاقة"
          value={stats.avgEnergy ? `${stats.avgEnergy.toFixed(1)} ${ENERGY_EMOJI[Math.round(stats.avgEnergy)] || ""}` : "—"}
          sub="من 5"
        />
        <StatCard
          theme={theme}
          label="متوسط تقييم اليوم"
          value={stats.avgRating ? `${stats.avgRating.toFixed(1)} ${RATING_EMOJI[Math.round(stats.avgRating)] || ""}` : "—"}
          sub="من 5"
        />
        <StatCard theme={theme} label="متوسط النوم" value={formatHours(stats.avgSleepHours)} sub="في اليوم" />
        <StatCard theme={theme} label="متوسط الهاتف" value={formatHours(stats.avgPhoneHours)} sub="في اليوم" />
      </div>

      {/* Last-4-weeks trends */}
      {weekSchedules && weekKey && (
        <WeekTrends
          weekSchedules={weekSchedules}
          weekKey={weekKey}
          currentWeekStats={stats}
          theme={theme}
        />
      )}

      {/* Time per category */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.xxl }}>
        <h3 style={{ margin: "0 0 14px 0", fontSize: FONT.lg, fontWeight: 700, color: theme.text }}>⏱️ الوقت حسب التصنيف</h3>
        {stats.categories.length === 0 ? (
          <p style={{ color: theme.textFaint, fontSize: FONT.md, margin: 0 }}>لا توجد مهام لها أوقات بعد.</p>
        ) : (
          <div style={{ display: "flex", gap: 14 }}>
            {/* Category list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: selectedCategory ? 200 : "100%", flexShrink: 0, transition: "width 0.2s" }}>
              {stats.categories.map((category) => {
                const categoryColor = colors[category.key];
                const barColor = categoryColor?.text || theme.accent;
                const widthPct = Math.round((category.minutes / maxCategoryMinutes) * 100);
                const sharePct = stats.totalMinutes > 0 ? Math.round((category.minutes / stats.totalMinutes) * 100) : 0;
                const isSelected = selectedCategoryKey === category.key;
                const taskCount = days.flatMap((d) => d.tasks || []).filter((t) => t.cat === category.key).length;
                return (
                  <div
                    key={category.key}
                    onClick={() => setSelectedCategoryKey(isSelected ? null : category.key)}
                    style={{
                      cursor: "pointer",
                      padding: "8px 10px",
                      borderRadius: RADIUS.md,
                      border: `1px solid ${isSelected ? barColor : theme.border}`,
                      background: isSelected ? barColor + "11" : "transparent",
                      transition: "background 0.15s, border 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: FONT.md, marginBottom: selectedCategory ? 0 : 4 }}>
                      <span style={{ fontWeight: 600, color: theme.text }}>
                        {category.icon} {category.label}
                        <span style={{
                          marginRight: 6,
                          fontSize: FONT.xs,
                          padding: "1px 6px",
                          borderRadius: RADIUS.pill,
                          background: theme.track,
                          color: theme.textMuted,
                        }}>{taskCount}</span>
                      </span>
                      <span style={{ color: theme.textMuted, fontSize: FONT.sm }}>
                        {formatMinutes(category.minutes)} · {sharePct}%
                      </span>
                    </div>
                    {!selectedCategory && (
                      <div style={{ background: theme.track, borderRadius: RADIUS.pill, height: 8, overflow: "hidden", marginTop: 4 }}>
                        <div style={{ width: `${widthPct}%`, height: "100%", background: barColor, borderRadius: RADIUS.pill, transition: "width 0.3s" }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Task detail panel */}
            {selectedCategory && (
              <CategoryTasksPanel
                category={selectedCategory}
                days={days}
                colors={colors}
                theme={theme}
                onClose={() => setSelectedCategoryKey(null)}
              />
            )}
          </div>
        )}
      </div>

      {/* Per-day breakdown */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: RADIUS.lg, padding: SPACING.lg }}>
        <h3 style={{ margin: "0 0 14px 0", fontSize: FONT.lg, fontWeight: 700, color: theme.text }}>📅 تفصيل الأيام</h3>
        {stats.perDay.length === 0 ? (
          <p style={{ color: theme.textFaint, fontSize: FONT.md, margin: 0 }}>لا توجد بيانات أيام بعد.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: FONT.md }}>
              <thead>
                <tr style={{ background: colors.header.bg, color: colors.header.text }}>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>اليوم</th>
                  <th style={{ padding: "8px 10px", textAlign: "center" }}>الإنجاز</th>
                  <th style={{ padding: "8px 10px", textAlign: "center" }}>الطاقة</th>
                  <th style={{ padding: "8px 10px", textAlign: "center" }}>التقييم</th>
                  <th style={{ padding: "8px 10px", textAlign: "center" }}>النوم</th>
                  <th style={{ padding: "8px 10px", textAlign: "center" }}>الهاتف</th>
                </tr>
              </thead>
              <tbody>
                {stats.perDay.map((day, index) => (
                  <tr key={day.id} style={{ background: index % 2 ? theme.surfaceAlt : theme.surface, borderBottom: `1px solid ${theme.borderSoft}`, color: theme.text }}>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>
                      {day.name} <span style={{ color: theme.textFaint, fontWeight: 400 }}>· {day.type}</span>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      {day.total > 0 ? `${day.done}/${day.total} · ${day.completionRate}%` : "—"}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      {day.energy ? `${ENERGY_EMOJI[day.energy] || ""} ${day.energy}` : "—"}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      {day.rating ? `${RATING_EMOJI[day.rating] || ""} ${day.rating}` : "—"}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", color: theme.textMuted }}>{day.sleep || "—"}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center", color: theme.textMuted }}>{day.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
