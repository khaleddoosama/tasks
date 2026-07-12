import { useMemo } from "react";
import { FEATURE_LABELS, daysSinceLastUse } from "../../services/featureUsage";
import { FONT, RADIUS, SPACING } from "../../theme/tokens";

const STALE_DAYS = 30;
const AGING_DAYS = 14;

function usageStatus(days, theme) {
  if (days === null) return { color: theme.danger, label: "لم تُستخدم", hint: "مرشحة للحذف" };
  if (days >= STALE_DAYS) return { color: theme.danger, label: `منذ ${days} يوم`, hint: "مرشحة للحذف" };
  if (days >= AGING_DAYS) return { color: theme.warning, label: `منذ ${days} يوم`, hint: "" };
  return { color: theme.success, label: days === 0 ? "اليوم" : `منذ ${days} يوم`, hint: "" };
}

// Monthly cleanup review: every tracked feature with its usage count and how
// long ago it was last used. Never-used and 30+ day features float to the top
// flagged red — those are the deletion candidates.
export default function FeatureUsagePanel({ featureUsage = {}, theme }) {
  const rows = useMemo(() => {
    const now = new Date();
    return Object.entries(FEATURE_LABELS)
      .map(([key, label]) => {
        const entry = featureUsage[key];
        const days = daysSinceLastUse(entry, now);
        return { key, label, count: entry ? Number(entry.count) : 0, days };
      })
      .sort((a, b) => {
        // Deletion candidates first: never used, then least recently used.
        if ((a.days === null) !== (b.days === null)) return a.days === null ? -1 : 1;
        return (b.days ?? 0) - (a.days ?? 0);
      });
  }, [featureUsage]);

  const staleCount = rows.filter((r) => r.days === null || r.days >= STALE_DAYS).length;

  return (
    <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: RADIUS.lg, padding: SPACING.lg, marginTop: SPACING.xxl }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: SPACING.sm, marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: FONT.lg, fontWeight: 700, color: theme.text }}>⚙️ استخدام الفيتشرز</h3>
        <span style={{ fontSize: FONT.sm, color: staleCount > 0 ? theme.danger : theme.textMuted }}>
          {staleCount > 0 ? `${staleCount} مرشحة للحذف (٣٠+ يوم بدون استخدام)` : "كل الفيتشرز مستخدمة مؤخرًا ✓"}
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: FONT.md }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${theme.border}` }}>
              <th style={{ padding: "6px 10px", textAlign: "right", color: theme.textMuted, fontSize: FONT.sm }}>الفيتشر</th>
              <th style={{ padding: "6px 10px", textAlign: "center", color: theme.textMuted, fontSize: FONT.sm }}>مرات الاستخدام</th>
              <th style={{ padding: "6px 10px", textAlign: "center", color: theme.textMuted, fontSize: FONT.sm }}>آخر استخدام</th>
              <th style={{ padding: "6px 10px", textAlign: "center", color: theme.textMuted, fontSize: FONT.sm }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const status = usageStatus(row.days, theme);
              return (
                <tr key={row.key} style={{ borderBottom: `1px solid ${theme.borderSoft}` }}>
                  <td style={{ padding: "7px 10px", textAlign: "right", color: theme.text, fontWeight: 600 }}>{row.label}</td>
                  <td style={{ padding: "7px 10px", textAlign: "center", color: theme.textBody }}>{row.count}</td>
                  <td style={{ padding: "7px 10px", textAlign: "center", color: status.color, fontWeight: 600 }}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: RADIUS.pill, background: status.color, marginLeft: 6, verticalAlign: "middle" }} />
                    {status.label}
                  </td>
                  <td style={{ padding: "7px 10px", textAlign: "center", color: theme.danger, fontSize: FONT.sm }}>{status.hint}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ margin: `${SPACING.md}px 0 0 0`, fontSize: FONT.sm, color: theme.textFaint }}>
        القياس بدأ من تاريخ إضافة الميزة — أي فيتشر "لم تُستخدم" محتاج شهر كامل من الاستخدام الطبيعي قبل الحكم عليه.
      </p>
    </div>
  );
}
