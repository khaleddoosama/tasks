import { useMemo, useState } from "react";
import { calculateWeekStats } from "../../domain/schedule/stats";
import { FONT, RADIUS, SPACING } from "../../theme/tokens";

// Parses "YYYY-WNN" → { year, week } or null.
function parseWeekKey(weekKey) {
  const match = /^(\d{4})-W(\d{1,2})$/.exec(weekKey || "");
  if (!match) return null;
  return { year: Number(match[1]), week: Number(match[2]) };
}

// Returns the current week plus up to 3 preceding weeks (same year), oldest first.
export function getTrendWeekKeys(weekKey, count = 4) {
  const parsed = parseWeekKey(weekKey);
  if (!parsed) return [];
  const keys = [];
  for (let week = Math.max(1, parsed.week - (count - 1)); week <= parsed.week; week++) {
    keys.push({ key: `${parsed.year}-W${String(week).padStart(2, "0")}`, week });
  }
  return keys;
}

function TrendTile({ title, unit, points, formatValue, maxValue, theme }) {
  const [hovered, setHovered] = useState(null);
  const barAreaHeight = 64;
  const known = points.filter((p) => p.value !== null);

  return (
    <div
      style={{
        flex: "1 1 200px",
        minWidth: 180,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        boxShadow: theme.shadow,
      }}
    >
      <div style={{ fontSize: FONT.sm, color: theme.textMuted, fontWeight: 600, marginBottom: SPACING.md }}>
        {title} {unit && <span style={{ color: theme.textFaint, fontWeight: 400 }}>({unit})</span>}
      </div>
      {known.length === 0 ? (
        <p style={{ color: theme.textFaint, fontSize: FONT.md, margin: 0 }}>لا توجد بيانات.</p>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-end", gap: SPACING.sm, height: barAreaHeight + 34 }}>
          {points.map((point, index) => {
            const isCurrent = index === points.length - 1;
            const hasValue = point.value !== null;
            const heightPx = hasValue && maxValue > 0 ? Math.max(3, (point.value / maxValue) * barAreaHeight) : 3;
            const showLabel = hasValue && (isCurrent || hovered === point.key);
            return (
              <div
                key={point.key}
                onMouseEnter={() => setHovered(point.key)}
                onMouseLeave={() => setHovered(null)}
                title={hasValue ? `${point.label}: ${formatValue(point.value)}` : `${point.label}: لا بيانات`}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "default" }}
              >
                <span style={{ fontSize: FONT.xs, fontWeight: isCurrent ? 800 : 600, color: theme.textBody, height: 14 }}>
                  {showLabel ? formatValue(point.value) : ""}
                </span>
                <div
                  style={{
                    width: "100%",
                    maxWidth: 34,
                    height: heightPx,
                    background: hasValue ? theme.accent : theme.track,
                    borderRadius: "4px 4px 0 0",
                    opacity: hasValue ? 1 : 0.6,
                    transition: "height 0.25s",
                  }}
                />
                <span style={{ fontSize: FONT.xs, color: isCurrent ? theme.textBody : theme.textFaint, fontWeight: isCurrent ? 700 : 400 }}>
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Trend of the last 4 weeks (completion %, avg energy, avg sleep) built from
// weekSchedules — the same per-week arrays the editor works on.
export default function WeekTrends({ weekSchedules, weekKey, currentWeekStats, theme }) {
  const points = useMemo(() => {
    const trendKeys = getTrendWeekKeys(weekKey);
    return trendKeys.map(({ key, week }) => {
      // The currently edited week may be newer in `currentWeekStats` than in weekSchedules.
      const stats =
        key === weekKey
          ? currentWeekStats
          : weekSchedules?.[key]
            ? calculateWeekStats(weekSchedules[key])
            : null;
      return {
        key,
        label: `أ${week}`,
        completion: stats && stats.totalTasks > 0 ? stats.completionRate : null,
        energy: stats?.avgEnergy ?? null,
        sleep: stats?.avgSleepHours ?? null,
        deepWork: stats && stats.totalTasks > 0 ? stats.deepWorkMinutes / 60 : null,
      };
    });
  }, [currentWeekStats, weekKey, weekSchedules]);

  if (points.length < 2) return null;

  return (
    <div style={{ marginBottom: SPACING.xxl }}>
      <h3 style={{ margin: `0 0 ${SPACING.md}px 0`, fontSize: FONT.lg, fontWeight: 700, color: theme.text }}>
        📈 آخر {points.length} أسابيع
      </h3>
      <div style={{ display: "flex", gap: SPACING.md, flexWrap: "wrap" }}>
        <TrendTile
          title="نسبة الإنجاز"
          unit="%"
          theme={theme}
          maxValue={100}
          formatValue={(v) => `${v}%`}
          points={points.map((p) => ({ key: p.key, label: p.label, value: p.completion }))}
        />
        <TrendTile
          title="متوسط الطاقة"
          unit="من 5"
          theme={theme}
          maxValue={5}
          formatValue={(v) => v.toFixed(1)}
          points={points.map((p) => ({ key: p.key, label: p.label, value: p.energy }))}
        />
        <TrendTile
          title="متوسط النوم"
          unit="ساعات"
          theme={theme}
          maxValue={10}
          formatValue={(v) => v.toFixed(1)}
          points={points.map((p) => ({ key: p.key, label: p.label, value: p.sleep }))}
        />
        <TrendTile
          title="🧠 عمل عميق"
          unit="ساعات"
          theme={theme}
          maxValue={Math.max(...points.map((p) => p.deepWork ?? 0), 1)}
          formatValue={(v) => v.toFixed(1)}
          points={points.map((p) => ({ key: p.key, label: p.label, value: p.deepWork }))}
        />
      </div>
    </div>
  );
}
