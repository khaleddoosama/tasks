import { GOALS, GOAL_COLORS } from "../../domain/schedule/constants";
import { formatDateDisplay } from "../../domain/schedule/week";

function sortGoals(goalNames, monthGoals, weekGoals) {
  return [...goalNames].sort((left, right) => {
    const leftPredefined = monthGoals[left]?.type !== "custom" && weekGoals[left]?.type !== "custom";
    const rightPredefined = monthGoals[right]?.type !== "custom" && weekGoals[right]?.type !== "custom";

    if (leftPredefined && !rightPredefined) return -1;
    if (!leftPredefined && rightPredefined) return 1;

    const leftIndex = GOALS.indexOf(left);
    const rightIndex = GOALS.indexOf(right);

    if (leftIndex !== -1 && rightIndex !== -1) return leftIndex - rightIndex;
    if (leftIndex !== -1) return -1;
    if (rightIndex !== -1) return 1;

    return left.localeCompare(right);
  });
}

function getStatusColor(percentage) {
  if (percentage >= 80) return "#27ae60";
  if (percentage >= 50) return "#f39c12";
  return "#e74c3c";
}

function getStatusLabel(percentage) {
  if (percentage >= 80) return "على المسار";
  if (percentage >= 50) return "يحتاج متابعة";
  return "متأخر";
}

export default function GoalsPanel({
  monthGoals,
  weekGoals,
  dayGoals,
  weekActuals,
  monthActuals,
  dailyActuals,
  days,
  onUpdateMonthGoal,
  onUpdateWeekGoal,
  onUpdateDayGoal,
  onDeleteGoal,
}) {
  const goalNames = sortGoals(
    new Set([...Object.keys(monthGoals), ...Object.keys(weekGoals)]),
    monthGoals,
    weekGoals,
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
      {goalNames.map((goalName, index) => {
        const monthGoal = monthGoals[goalName] || { target: 0, type: "predefined" };
        const weekGoal = weekGoals[goalName] || { target: 0, mode: "auto", type: monthGoal.type };
        const monthActual = monthActuals[goalName] || 0;
        const weekActual = weekActuals[goalName] || 0;
        const weekPercentage = weekGoal.target > 0 ? (weekActual / weekGoal.target) * 100 : 0;
        const statusColor = getStatusColor(weekPercentage);
        const statusLabel = getStatusLabel(weekPercentage);
        const goalColor = GOAL_COLORS[index % GOAL_COLORS.length];
        const isCustom = monthGoal.type === "custom" || weekGoal.type === "custom";

        return (
          <div
            key={goalName}
            style={{
              background: "#fff",
              borderRadius: 16,
              border: `2px solid ${statusColor}33`,
              boxShadow: "0 10px 24px rgba(15,23,42,0.07)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: 16,
                background: `linear-gradient(135deg, ${goalColor}22, ${statusColor}18)`,
                borderBottom: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: goalColor }} />
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1f2937" }}>{goalName}</h3>
                    {isCustom && (
                      <span style={{ fontSize: 11, color: "#7c3aed", background: "#f3e8ff", padding: "2px 8px", borderRadius: 999 }}>
                        مخصص
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "#475569" }}>
                    التقدم الأسبوعي: {weekActual.toFixed(1)}h من {weekGoal.target.toFixed(1)}h
                  </div>
                </div>
                <div style={{ textAlign: "left" }}>
                  {isCustom && (
                    <button
                      onClick={() => onDeleteGoal(goalName)}
                      style={{
                        display: "block",
                        marginBottom: 8,
                        marginRight: "auto",
                        border: "none",
                        background: "#fee2e2",
                        color: "#b91c1c",
                        borderRadius: 8,
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      حذف
                    </button>
                  )}
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: 12,
                      fontWeight: 700,
                      color: statusColor,
                      background: `${statusColor}18`,
                      padding: "6px 10px",
                      borderRadius: 999,
                    }}
                  >
                    {statusLabel} {Math.round(weekPercentage)}%
                  </span>
                </div>
              </div>
            </div>

            <div style={{ padding: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ background: "#f8fafc", borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>الهدف الشهري</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={monthGoal.target}
                      onChange={(event) => onUpdateMonthGoal(goalName, parseFloat(event.target.value) || 0)}
                      style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, textAlign: "center" }}
                    />
                    <span style={{ fontSize: 12, color: "#475569" }}>ساعة</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
                    الفعلي من الأيام الظاهرة: {monthActual.toFixed(1)}h
                  </div>
                </div>

                <div style={{ background: "#f8fafc", borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                    الهدف الأسبوعي {weekGoal.mode === "manual" ? "(يدوي)" : "(تلقائي)"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={weekGoal.target}
                      onChange={(event) => onUpdateWeekGoal(goalName, parseFloat(event.target.value) || 0)}
                      style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, textAlign: "center" }}
                    />
                    <span style={{ fontSize: 12, color: "#475569" }}>ساعة</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
                    الشهري الحالي يقترح: {(weekGoal.monthTarget || 0).toFixed(1)}h / شهر
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", marginBottom: 10 }}>التوزيع اليومي</div>
              <div style={{ display: "grid", gap: 8 }}>
                {days
                  .filter((day) => day.التاريخ)
                  .map((day) => {
                    const dateKey = day.التاريخ;
                    const dayGoal = dayGoals[dateKey]?.[goalName] || { target: 0, enabled: false, mode: "auto" };
                    const dayActual = dailyActuals[dateKey]?.[goalName] || 0;

                    return (
                      <div
                        key={`${goalName}-${dateKey}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.2fr 0.9fr 0.9fr auto",
                          gap: 8,
                          alignItems: "center",
                          background: day.enabled ? "#ffffff" : "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: 10,
                          padding: 10,
                          opacity: day.enabled ? 1 : 0.6,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>{day.name}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{formatDateDisplay(dateKey)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                            هدف {dayGoal.mode === "manual" ? "يدوي" : "تلقائي"}
                          </div>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            disabled={!day.enabled}
                            value={dayGoal.target}
                            onChange={(event) => onUpdateDayGoal(dateKey, goalName, parseFloat(event.target.value) || 0)}
                            style={{ width: "100%", padding: "7px 8px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12, textAlign: "center", background: day.enabled ? "#fff" : "#f1f5f9" }}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>الفعلي</div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: dayActual >= dayGoal.target && dayGoal.target > 0 ? "#16a34a" : "#0f172a" }}>
                            {dayActual.toFixed(1)}h
                          </div>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: day.enabled ? "#475569" : "#94a3b8", whiteSpace: "nowrap" }}>
                          {day.enabled ? "مفعّل" : "غير مفعّل"}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
